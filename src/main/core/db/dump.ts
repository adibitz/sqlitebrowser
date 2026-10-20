// Port of reference/sqliteview/core/db.py (dump): exports the main schema as an SQL script.
import { closeSync, openSync, rmSync } from 'node:fs'
import type { SqlValue } from '@shared/types/values'
import { escapeIdentifier, escapeIdentifiers, ObjectIdentifier } from '@shared/sqlb/identifier'
import type { SchemaObject, Table } from '@shared/sqlb/table'
import { bufferedWriter } from '../bufferedWriter'
import { querySingleValue } from './execute'
import { getSchema } from './schemaLoad'
import { requireConn, type DbSession } from './session'
import { sqlLiteral } from '@shared/format/sqlLiteral'

export interface DumpOptions {
  tables: readonly string[]
  insertColumnNames: boolean
  /** INSERT … VALUES (…), (…); instead of one INSERT per row. */
  insertMultipleRows: boolean
  /** Write the CREATE statements as originally written instead of regenerating them. */
  keepOriginal: boolean
  exportSchema: boolean
  exportData: boolean
  /** Keep existing objects: no DROP, CREATE … IF NOT EXISTS. */
  keepOldSchema: boolean
  /** Return false to cancel; the partial file is removed. */
  progress?: (done: number, total: number) => boolean
}

class Cancelled extends Error {}

function createStatement(t: Table, opts: DumpOptions): string {
  if (t.fullyParsed && !opts.keepOriginal) return t.sql('main', opts.keepOldSchema) + '\n'
  let stmt = t.originalSql
  if (opts.keepOldSchema) {
    stmt =
      stmt.slice(0, 20).toUpperCase() === 'CREATE VIRTUAL TABLE'
        ? 'CREATE VIRTUAL TABLE IF NOT EXISTS' + stmt.slice(20)
        : 'CREATE TABLE IF NOT EXISTS' + stmt.slice(12)
  }
  return stmt + ';\n'
}

export function dumpDatabase(session: DbSession, filename: string, opts: DumpOptions): void {
  const conn = requireConn(session)
  const objmap = getSchema(session, 'main')
  const tables = [...(objmap?.tables ?? new Map<string, Table>())]
    .filter(
      ([name, t]) => !t.isView() && !name.toLowerCase().startsWith('sqlite_') && opts.tables.includes(name),
    )
    .map(([, t]) => t)

  let total = 0
  for (const t of tables) {
    total += Number(
      querySingleValue(session, `SELECT COUNT(*) FROM ${new ObjectIdentifier('main', t.name).toString()}`) ??
        0,
    )
  }
  let done = 0

  const fd = openSync(filename, 'w')
  const out = bufferedWriter(fd)
  try {
    out.write('BEGIN TRANSACTION;\n')
    if (opts.exportSchema) {
      for (const t of tables) {
        if (!opts.keepOldSchema) out.write(`DROP TABLE IF EXISTS ${escapeIdentifier(t.name)};\n`)
        out.write(createStatement(t, opts))
      }
    }
    if (opts.exportData) {
      for (const t of tables) {
        const cols = t.fields.filter((f) => !f.generated).map((f) => f.name)
        const colList = escapeIdentifiers(cols).join(',')
        const sql = t.fields.some((f) => f.generated)
          ? `SELECT ${colList} FROM ${escapeIdentifier(t.name)}`
          : `SELECT * FROM ${escapeIdentifier(t.name)}`
        const lineSep = opts.insertMultipleRows ? '),\n' : ');\n'
        let head = `INSERT INTO ${escapeIdentifier(t.name)}`
        if (opts.insertColumnNames) head += ` (${colList})`
        head += ' VALUES ('
        let counter = 0
        for (const row of conn.prepare(sql).raw(true).iterate() as Iterable<SqlValue[]>) {
          if (counter) out.write(lineSep)
          out.write(!opts.insertMultipleRows || !counter ? head : ' (')
          out.write(row.map(sqlLiteral).join(','))
          counter++
          done++
          if (opts.progress && counter % 1000 === 0 && !opts.progress(done, total)) throw new Cancelled()
        }
        if (counter) out.write(');\n')
      }
    }
    if (opts.exportSchema) {
      const writeObjects = (kind: string, objects: Iterable<SchemaObject>): void => {
        for (const obj of objects) {
          const base = obj.baseTable()
          if (base && !opts.tables.includes(base)) continue
          if (!obj.originalSql) continue
          if (!opts.keepOldSchema)
            out.write(`DROP ${kind.toUpperCase()} IF EXISTS ${escapeIdentifier(obj.name)};\n`)
          if (obj.fullyParsed && !opts.keepOriginal) out.write(obj.sql('main', opts.keepOldSchema) + '\n')
          else out.write(obj.originalSql + ';\n')
        }
      }
      writeObjects(
        'view',
        [...(objmap?.tables.values() ?? [])].filter((t) => t.isView()),
      )
      writeObjects('index', objmap?.indices.values() ?? [])
      writeObjects('trigger', objmap?.triggers.values() ?? [])
    }
    out.write('COMMIT;\n')
    out.flush()
  } catch (err) {
    closeSync(fd)
    if (err instanceof Cancelled) {
      rmSync(filename, { force: true })
      throw new Error('Export cancelled.', { cause: err })
    }
    throw err
  }
  closeSync(fd)
  opts.progress?.(total, total)
}
