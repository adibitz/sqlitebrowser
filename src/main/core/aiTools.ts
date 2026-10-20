// What the AI's MCP tools do on the open database. Reads go through prepared statements that SQLite
// reports as read-only; writes run inside a savepoint, so Revert undoes them like any other change.
import type { JsonCell } from '@shared/types/chat'
import type { ObjectRef } from '@shared/types/schema'
import type { SqlValue } from '@shared/types/values'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { executeMultiSql, logSql, querySingleValue } from './db/execute'
import { getTableByName } from './db/schemaLoad'
import { requireConn, type DbSession } from './db/session'

/** Rows a tool returns at most; the model is told when there were more. */
export const MAX_TOOL_ROWS = 200
const MAX_TEXT = 1000

export interface ToolTable {
  columns: string[]
  rows: JsonCell[][]
  /** Rows the statement produced (counted up to MAX_TOOL_ROWS + 1). */
  total: number
  truncated: boolean
}

/** A value as JSON carries it: long text is shortened, BLOBs are described, big integers become text. */
export function jsonCell(v: SqlValue): JsonCell {
  if (v === null || typeof v === 'string')
    return v !== null && v.length > MAX_TEXT ? v.slice(0, MAX_TEXT) + '…' : v
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString()
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v)
  return `[BLOB ${v.length} bytes]`
}

function readTable(session: DbSession, sql: string, params: SqlValue[] = []): ToolTable {
  const stmt = requireConn(session).prepare(sql)
  if (!stmt.reader) throw new Error('This statement returns no rows.')
  const columns = stmt.columns().map((c) => c.name)
  const rows: JsonCell[][] = []
  let total = 0
  for (const row of stmt.raw(true).iterate(...params) as IterableIterator<SqlValue[]>) {
    total++
    if (total > MAX_TOOL_ROWS) break
    rows.push(row.map(jsonCell))
  }
  return { columns, rows, total: Math.min(total, MAX_TOOL_ROWS + 1), truncated: total > MAX_TOOL_ROWS }
}

function requireTable(session: DbSession, ref: ObjectRef) {
  const t = getTableByName(session, new ObjectIdentifier(ref.schema, ref.name))
  if (!t) throw new Error(`There is no table or view ${ref.schema}.${ref.name}.`)
  return t
}

export interface TableListing {
  schema: string
  name: string
  kind: 'table' | 'view'
  columns: string[]
}

export function listTables(session: DbSession): TableListing[] {
  requireConn(session)
  return [...session.schemata].flatMap(([schema, objmap]) =>
    [...objmap.tables]
      .filter(([name]) => !name.startsWith('sqlite_'))
      .map(([name, t]) => ({
        schema,
        name,
        kind: t.isView() ? ('view' as const) : ('table' as const),
        columns: t.fieldNames(),
      })),
  )
}

export function describeTable(session: DbSession, ref: ObjectRef) {
  const t = requireTable(session, ref)
  const pk = new Set(t.primaryKeyNames())
  const objmap = session.schemata.get(ref.schema)
  return {
    schema: ref.schema,
    name: ref.name,
    kind: t.isView() ? 'view' : 'table',
    sql: t.originalSql,
    columns: t.fields.map((f) => ({
      name: f.name,
      type: f.type,
      notNull: f.notNull,
      primaryKey: pk.has(f.name),
      default: f.defaultValue || null,
      references: t.foreignKey([f.name])?.toString() ?? null,
    })),
    indices: [...(objmap?.indices ?? [])]
      .filter(([, i]) => i.baseTable() === ref.name)
      .map(([name, i]) => ({ name, unique: i.unique, columns: i.fields.map((c) => c.name) })),
    rowCount: Number(
      querySingleValue(
        session,
        `SELECT count(*) FROM ${new ObjectIdentifier(ref.schema, ref.name).toString()}`,
        { log: false },
      ),
    ),
  }
}

export function sampleRows(session: DbSession, ref: ObjectRef, limit: number): ToolTable {
  requireTable(session, ref)
  const n = Math.max(1, Math.min(limit, MAX_TOOL_ROWS))
  return readTable(
    session,
    `SELECT * FROM ${new ObjectIdentifier(ref.schema, ref.name).toString()} LIMIT ${n}`,
  )
}

/** A read the model may run without asking: SQLite must report the statement as read-only. */
export function runQuery(session: DbSession, sql: string): ToolTable {
  const stmt = requireConn(session).prepare(sql)
  if (!stmt.readonly || !stmt.reader) {
    throw new Error(
      'run_query only runs statements that read. Use run_sql for changes; the user approves them.',
    )
  }
  logSql(session, sql)
  return readTable(session, sql)
}

/** A change the user approved; it stays pending until they write it, and Revert undoes it. */
export function runSql(session: DbSession, sql: string): { changes: number } {
  requireConn(session)
  if (session.readOnly) throw new Error('The database is opened read-only, so it cannot be changed.')
  const before = Number(querySingleValue(session, 'SELECT total_changes()', { log: false }))
  executeMultiSql(session, sql, { dirty: true, log: true })
  const after = Number(querySingleValue(session, 'SELECT total_changes()', { log: false }))
  return { changes: after - before }
}
