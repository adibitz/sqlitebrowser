// Port of reference/sqliteview/core/db.py (create_table, add_column, rename_table, alter_table).
// ALTER TABLE is emulated like upstream: SQLite's own RENAME / ADD COLUMN / RENAME COLUMN first,
// otherwise rebuild the table (create new, copy data, drop old, rename) with defer_foreign_keys and
// restore its indices and triggers.
import type { Field } from '@shared/sqlb/field'
import { escapeIdentifier, escapeIdentifiers, ObjectIdentifier } from '@shared/sqlb/identifier'
import { Table } from '@shared/sqlb/table'
import type { TrackColumns } from '@shared/types/schema'
import { executeSql, querySingleValue } from './execute'
import { getPragma, setPragma } from './pragmas'
import {
  generateSavepointName,
  generateTemporaryTableName,
  releaseSavepoint,
  revertToSavepoint,
  setSavepoint,
} from './savepoints'
import { getSchema, getTableByName, updateSchema } from './schemaLoad'
import { withoutStructureChecks, type DbSession } from './session'

export function createTable(session: DbSession, name: ObjectIdentifier, fields: Field[]): void {
  const t = new Table(name.name)
  t.fields = [...fields]
  executeSql(session, t.sql(name.schema))
}

export function addColumn(session: DbSession, table: ObjectIdentifier, f: Field): void {
  executeSql(session, `ALTER TABLE ${table.toString()} ADD COLUMN ${f.toString(' ', ' ')}`)
}

export function renameTable(session: DbSession, schema: string, fromTable: string, toTable: string): void {
  if (fromTable === toTable) return
  if (fromTable.toLowerCase() === toTable.toLowerCase()) {
    // SQLite refuses a rename that only changes case; go through a temporary name.
    const tmp = generateTemporaryTableName(session, schema)
    renameTable(session, schema, fromTable, tmp)
    renameTable(session, schema, tmp, toTable)
    return
  }
  const sql =
    `ALTER TABLE ${escapeIdentifier(schema)}.${escapeIdentifier(fromTable)} ` +
    `RENAME TO ${escapeIdentifier(toTable)}`
  try {
    executeSql(session, sql)
  } catch (err) {
    throw new Error(
      `Error renaming table '${fromTable}' to '${toTable}'.\nMessage from database engine:\n${(err as Error).message}`,
      { cause: err },
    )
  }
}

/** Runs `fn`; on failure reverts the savepoint and rethrows with `prefix` + the original message. */
function step(session: DbSession, savepoint: string, prefix: string, fn: () => void): void {
  try {
    fn()
  } catch (err) {
    const message = prefix + (err as Error).message
    revertToSavepoint(session, savepoint)
    throw new Error(message, { cause: err })
  }
}

function checkTargetName(session: DbSession, schema: string, name: string): void {
  if (getTableByName(session, new ObjectIdentifier(schema, name))) {
    throw new Error(`A table with the name '${name}' already exists in schema '${schema}'.`)
  }
}

/** Changes the table `tablename` to look like `newTable`. */
export function alterTable(
  session: DbSession,
  tablename: ObjectIdentifier,
  newTable: Table,
  trackColumns: TrackColumns,
  newSchemaArg = '',
): void {
  // ---- part 1: checks
  const newSchema = newSchemaArg || tablename.schema
  if (!newSchemaArg) {
    if (tablename.name !== newTable.name) checkTargetName(session, newSchema, newTable.name)
  } else if (newSchema !== tablename.schema) {
    checkTargetName(session, newSchema, newTable.name)
  }

  const oldPtr = getTableByName(session, tablename)
  if (!oldPtr) {
    throw new Error(`No table with name '${tablename.name}' exists in schema '${tablename.schema}'.`)
  }
  let oldTable = oldPtr.clone()
  let track: TrackColumns = [...trackColumns]

  for (const [old] of track) {
    if (old !== null && !oldTable.findField(old)) throw new Error(`Cannot find column ${old}.`)
  }
  const trackedOld = new Set(track.map(([o]) => o).filter((o) => o !== null))
  for (const f of oldTable.fields) if (!trackedOld.has(f.name)) track.push([f.name, f.name])
  for (const [, neu] of track) {
    if (neu !== null && !newTable.findField(neu)) throw new Error(`Cannot find column ${neu}.`)
  }

  if (oldTable.equals(newTable) && newSchema === tablename.schema) return

  const savepoint = generateSavepointName('renamecolumn')
  try {
    if (!setSavepoint(session, savepoint)) throw new Error('the database is read-only')
  } catch (err) {
    throw new Error(`Creating savepoint failed. DB says: ${(err as Error).message}`, { cause: err })
  }

  withoutStructureChecks(session, () => {
    // ---- part 2: use SQLite's own ALTER TABLE as far as possible
    let changed = false
    if (newSchema === tablename.schema && tablename.name !== newTable.name) {
      step(session, savepoint, '', () => renameTable(session, tablename.schema, oldTable.name, newTable.name))
      changed = true
    }

    const added = new Set(track.filter(([o]) => o === null).map(([, n]) => n))
    for (const f of newTable.fields) {
      if (!added.has(f.name)) continue
      step(session, savepoint, '', () =>
        addColumn(session, new ObjectIdentifier(tablename.schema, newTable.name), f),
      )
      changed = true
    }
    // Added columns now exist in the table under their own name.
    track = track.map(([o, n]) => (o === null ? [n, n] : [o, n]))

    track = track.map(([old, neu]) => {
      if (old === null || neu === null || old === neu) return [old, neu]
      const sql =
        `ALTER TABLE ${new ObjectIdentifier(tablename.schema, newTable.name).toString()} RENAME COLUMN ` +
        `${escapeIdentifier(old)} TO ${escapeIdentifier(neu)}`
      step(session, savepoint, 'Renaming the column failed. DB says:\n', () => executeSql(session, sql))
      changed = true
      return [neu, neu]
    })

    if (changed) {
      updateSchema(session)
      const current = getTableByName(session, new ObjectIdentifier(tablename.schema, newTable.name))
      if (current) oldTable = current.clone()
    }

    if (tablename.schema === newSchema && oldTable.equals(newTable)) {
      releaseOrThrow(session, savepoint)
      return
    }

    rebuildTable(session, savepoint, tablename, oldTable, newTable, newSchema, track)
    releaseOrThrow(session, savepoint)
  })
  updateSchema(session)
}

function releaseOrThrow(session: DbSession, savepoint: string): void {
  try {
    releaseSavepoint(session, savepoint)
  } catch (err) {
    throw new Error(`Releasing savepoint failed. DB says: ${(err as Error).message}`, { cause: err })
  }
}

/** ---- part 3: create the new table, copy data, drop the old one, rename, restore indices/triggers. */
function rebuildTable(
  session: DbSession,
  savepoint: string,
  tablename: ObjectIdentifier,
  oldTable: Table,
  newTable: Table,
  newSchema: string,
  track: TrackColumns,
): void {
  const tmpTable = newTable.clone()
  tmpTable.name = generateTemporaryTableName(session, newSchema)
  step(session, savepoint, 'Creating new table failed. DB says: ', () =>
    executeSql(session, tmpTable.sql(newSchema), { dirty: true, log: true }),
  )

  const copyFrom: string[] = []
  const copyTo: string[] = []
  for (const [old, neu] of track) {
    if (old === null || neu === null) continue
    const nf = newTable.findField(neu)
    if (!nf || nf.generated || !oldTable.findField(old)) continue
    copyFrom.push(old)
    copyTo.push(neu)
  }
  if (copyTo.length) {
    const sql =
      `INSERT INTO ${escapeIdentifier(newSchema)}.${escapeIdentifier(tmpTable.name)} ` +
      `(${escapeIdentifiers(copyTo).join(',')}) SELECT ${escapeIdentifiers(copyFrom).join(',')} ` +
      `FROM ${escapeIdentifier(tablename.schema)}.${escapeIdentifier(oldTable.name)}`
    step(session, savepoint, 'Copying data to new table failed. DB says:\n', () => executeSql(session, sql))
  }

  const otherSql = dependentObjectsSql(session, tablename.schema, oldTable.name, newSchema, track)

  const fkOld = getPragma(session, 'defer_foreign_keys')
  setPragma(session, 'defer_foreign_keys', '1')
  // Since SQLite 3.26 RENAME validates views/triggers, which fails while the original table is gone.
  // Legacy mode restores the documented 12-step behaviour and can be toggled inside the transaction.
  const legacyOld = querySingleValue(session, 'PRAGMA legacy_alter_table;', { log: false })
  executeSql(session, 'PRAGMA legacy_alter_table = 1;', { dirty: false, log: true })
  const restorePragmas = (): void => {
    executeSql(session, `PRAGMA legacy_alter_table = ${Number(legacyOld ?? 0)};`, { dirty: false, log: true })
    setPragma(session, 'defer_foreign_keys', String(fkOld ?? 0))
  }

  const withRestore = (prefix: string, fn: () => void): void =>
    step(session, savepoint, prefix, () => {
      try {
        fn()
      } catch (err) {
        restorePragmas()
        throw err
      }
    })
  withRestore('Deleting old table failed. DB says: ', () =>
    executeSql(
      session,
      `DROP TABLE ${escapeIdentifier(tablename.schema)}.${escapeIdentifier(oldTable.name)}`,
      { dirty: true, log: true },
    ),
  )
  withRestore('', () => renameTable(session, newSchema, tmpTable.name, newTable.name))
  restorePragmas()

  const errored: string[] = []
  for (const sql of otherSql) {
    try {
      executeSql(session, sql, { dirty: true, log: true })
    } catch {
      errored.push(sql)
    }
  }
  if (errored.length) {
    session.events.warning?.(
      'Restoring some of the objects associated with this table failed. This is most likely because some ' +
        "column names changed. Here's the SQL statement which you might want to fix and execute manually:\n\n" +
        errored.join('\n'),
    )
  }
}

/** Indices and triggers on the table, which DROP TABLE removes; indices follow renamed/dropped columns. */
function dependentObjectsSql(
  session: DbSession,
  schema: string,
  tableName: string,
  newSchema: string,
  track: TrackColumns,
): string[] {
  const out: string[] = []
  const objmap = getSchema(session, schema)
  if (!objmap) return out
  for (const idx of objmap.indices.values()) {
    if (idx.baseTable() !== tableName || !idx.originalSql) continue
    if (!idx.fullyParsed) {
      out.push(idx.originalSql + ';')
      continue
    }
    const copy = idx.clone()
    for (const [old, neu] of track) {
      if (old === null) continue
      if (neu !== null) {
        for (const c of copy.fields) if (c.name === old) c.name = neu
      } else {
        while (copy.removeField(old)) {
          // remove every occurrence
        }
      }
    }
    if (copy.fields.length) out.push(copy.sql(newSchema))
  }
  for (const trg of objmap.triggers.values()) {
    if (trg.baseTable() === tableName) out.push(trg.originalSql + ';')
  }
  return out
}
