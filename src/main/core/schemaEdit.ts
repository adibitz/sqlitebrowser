// Port of reference/sqliteview/ui/main_window.py (edit_table, create_index, drop_object),
// EditTableDialog.accept / EditIndexDialog.accept and DbInfoTab.reload / save.
// The dialogs send CREATE statements; they are parsed again here so only those statements run.
import { statSync } from 'node:fs'
import type {
  DatabaseInfo,
  DroppableKind,
  PragmaChanges,
  SchemaChangeResult,
  TableDefinition,
} from '@shared/ipc/schema'
import { parseIndex } from '@shared/parser/createIndex'
import { parseTable } from '@shared/parser/createTable'
import { PRAGMA_NAMES } from '@shared/schema/pragmas'
import { escapeIdentifier, ObjectIdentifier } from '@shared/sqlb/identifier'
import type { ObjectRef, TrackColumns } from '@shared/types/schema'
import { MEMORY_DATABASE } from '@shared/types/db'
import { alterTable } from './db/alterTable'
import { executeSql, querySingleValue } from './db/execute'
import { getPragma, setPragma } from './db/pragmas'
import { releaseAllSavepoints, revertAll, revertToUndoSavepoint, setUndoSavepoint } from './db/savepoints'
import { getTableByName, updateSchema } from './db/schemaLoad'
import { isDirty, requireConn, type DbSession } from './db/session'

const DROP_WORDS: Record<DroppableKind, string> = {
  table: 'TABLE',
  view: 'VIEW',
  index: 'INDEX',
  trigger: 'TRIGGER',
}

const id = (ref: ObjectRef): ObjectIdentifier => new ObjectIdentifier(ref.schema, ref.name)

function requireWritable(session: DbSession): void {
  requireConn(session)
  if (session.readOnly) throw new Error('The database is opened read-only.')
}

/** Runs `fn` behind an undo point; on failure the database goes back to it. */
function withUndo(session: DbSession, fn: () => void): void {
  setUndoSavepoint(session)
  try {
    fn()
  } catch (err) {
    revertToUndoSavepoint(session)
    updateSchema(session)
    throw err
  }
}

export function tableDefinition(session: DbSession, ref: ObjectRef): TableDefinition {
  const t = getTableByName(session, id(ref))
  if (!t || t.isView() || t.isVirtual()) throw new Error(`'${ref.name}' isn't a table that can be modified.`)
  return { sql: t.sql(ref.schema), fullyParsed: t.fullyParsed }
}

export interface SaveTableRequest {
  original: ObjectRef | null
  schema: string
  sql: string
  track: TrackColumns
  commitConfirmed: boolean
}

export function saveTable(session: DbSession, req: SaveTableRequest): SchemaChangeResult {
  requireWritable(session)
  const table = parseTable(req.sql)
  if (!table.fullyParsed || table.isVirtual() || !table.name) {
    throw new Error("The table definition couldn't be read.")
  }
  const ref = { schema: req.schema, name: table.name }
  if (!req.original) {
    withUndo(session, () => executeSql(session, table.sql(req.schema)))
    return { kind: 'done', ref }
  }
  const original = req.original
  const newSchema = req.schema !== original.schema ? req.schema : ''
  const alter = (): void =>
    withUndo(session, () => alterTable(session, id(original), table, req.track, newSchema))

  // With foreign keys on, the rebuild has to run with them off, outside a transaction (upstream).
  if (String(getPragma(session, 'foreign_keys')) !== '1') {
    alter()
    return { kind: 'done', ref }
  }
  if (isDirty(session) && !req.commitConfirmed) return { kind: 'needsCommit' }
  releaseAllSavepoints(session)
  setPragma(session, 'foreign_keys', 0)
  try {
    alter()
    const bad = querySingleValue(session, `PRAGMA ${escapeIdentifier(req.schema)}.foreign_key_check;`)
    if (bad !== null) {
      revertAll(session)
      updateSchema(session)
      throw new Error('Error checking foreign keys after table modification. The changes were reverted.')
    }
    releaseAllSavepoints(session)
  } finally {
    setPragma(session, 'foreign_keys', 1)
  }
  return { kind: 'done', ref }
}

export function createIndex(session: DbSession, sql: string): void {
  requireWritable(session)
  const index = parseIndex(sql)
  if (!index.fullyParsed || !index.name) throw new Error("The index definition couldn't be read.")
  withUndo(session, () => executeSql(session, sql))
}

export function dropObject(session: DbSession, kind: DroppableKind, ref: ObjectRef): void {
  requireWritable(session)
  withUndo(session, () => executeSql(session, `DROP ${DROP_WORDS[kind]} ${id(ref).toString()};`))
}

function fileSize(path: string): number {
  if (!path || path === MEMORY_DATABASE) return 0
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

export function databaseInfo(session: DbSession): DatabaseInfo {
  requireConn(session)
  const number = (pragma: string): number => Number(getPragma(session, pragma) ?? 0)
  return {
    fileSize: fileSize(session.curFile),
    pageSize: number('page_size'),
    pageCount: number('page_count'),
    freePages: number('freelist_count'),
    pragmas: Object.fromEntries(PRAGMA_NAMES.map((name) => [name, getPragma(session, name)])),
  }
}

export function setPragmas(
  session: DbSession,
  values: PragmaChanges,
  commitConfirmed: boolean,
): SchemaChangeResult {
  requireWritable(session)
  const names = Object.keys(values)
  const unknown = names.find((n) => !PRAGMA_NAMES.includes(n))
  if (unknown) throw new Error(`Unknown pragma ${unknown}.`)
  if (!names.length) return { kind: 'done' }
  if (isDirty(session) && !commitConfirmed) return { kind: 'needsCommit' }
  // Upstream only released the innermost savepoint, so e.g. foreign_keys was ignored while an
  // undo point stayed open. The user agreed to commit, so commit everything.
  releaseAllSavepoints(session)
  for (const name of names) {
    try {
      setPragma(session, name, values[name]!)
    } catch (err) {
      throw new Error(`Setting ${name} failed: ${(err as Error).message}`, { cause: err })
    }
  }
  return { kind: 'done' }
}
