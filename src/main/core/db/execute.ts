// Port of reference/sqliteview/core/db.py (log_sql, run, fetch_all, execute_sql, execute_multi_sql,
// query_single_value).
import type { SqlValue } from '@shared/types/values'
import { iterStatements } from '@shared/sql/sqlsplit'
import { generateSavepointName, revertToSavepoint, setSavepoint } from './savepoints'
import { updateSchema } from './schemaLoad'
import { LogMessageType, requireConn, type DbSession } from './session'

const STRUCTURE_PREFIXES = ['ALTER', 'CREATE', 'DROP', 'ROLLBACK']
const MISSING_COLLATION_RE = /no such collation sequence: (\S+)/i

export interface StatementResult {
  columns: string[]
  /** null for statements that return no rows (INSERT, CREATE, …). */
  rows: SqlValue[][] | null
  changes: number
  lastInsertRowid: bigint
}

export function logSql(session: DbSession, statement: string, type = LogMessageType.App): void {
  session.events.log?.(statement.trim(), type)
}

/** better-sqlite3 binds Buffers, not plain Uint8Arrays. */
function toBindable(v: SqlValue): unknown {
  return v instanceof Uint8Array && !Buffer.isBuffer(v)
    ? Buffer.from(v.buffer, v.byteOffset, v.byteLength)
    : v
}

function translateError(err: unknown): Error {
  const error = err instanceof Error ? err : new Error(String(err))
  const m = MISSING_COLLATION_RE.exec(error.message)
  if (m) {
    // better-sqlite3 can't register collations on demand like the Python version did.
    return new Error(`This database uses the collation ${m[1]}, which SQliteView can't provide.`)
  }
  return error
}

function startsWithStructurePrefix(statement: string): boolean {
  const head = statement.trimStart().slice(0, 8).toUpperCase()
  return STRUCTURE_PREFIXES.some((p) => head.startsWith(p))
}

/** Runs one statement. Rows come back as arrays; INTEGER as bigint. */
export function runStatement(
  session: DbSession,
  sql: string,
  params: readonly SqlValue[] = [],
): StatementResult {
  const conn = requireConn(session)
  try {
    const stmt = conn.prepare(sql)
    const bound = params.map(toBindable)
    if (stmt.reader) {
      const rows = stmt.raw(true).all(...bound) as SqlValue[][]
      return { columns: stmt.columns().map((c) => c.name), rows, changes: 0, lastInsertRowid: 0n }
    }
    const info = stmt.run(...bound)
    return { columns: [], rows: null, changes: info.changes, lastInsertRowid: BigInt(info.lastInsertRowid) }
  } catch (err) {
    throw translateError(err)
  }
}

export interface ExecuteOptions {
  /** Wrap in the RESTOREPOINT savepoint so it can be reverted (default true). */
  dirty?: boolean
  log?: boolean
}

/** Executes one or more statements (sqlite3_exec semantics). Throws "<error> (<statement>)". */
export function executeSql(
  session: DbSession,
  statement: string,
  { dirty = true, log = true }: ExecuteOptions = {},
): void {
  requireConn(session)
  if (dirty) setSavepoint(session)
  if (log) logSql(session, statement)
  try {
    for (const st of iterStatements(statement)) runStatement(session, st.text)
  } catch (err) {
    throw new Error(`${(err as Error).message} (${statement})`, { cause: err })
  }
  if (!session.structureChecksDisabled && startsWithStructurePrefix(statement)) updateSchema(session)
}

export interface MultiSqlOptions extends ExecuteOptions {
  /** Called with 0–100; return false to cancel (changes are rolled back). */
  progress?: (percent: number) => boolean
}

/** Executes a script statement by statement and rolls everything back on error (executeMultiSQL). */
export function executeMultiSql(
  session: DbSession,
  query: string,
  { dirty = true, log = false, progress }: MultiSqlOptions = {},
): void {
  requireConn(session)
  if (log) logSql(session, query)
  const total = Math.max(1, query.length)
  let structureUpdated = false
  let savepointName = ''
  let lastProgress = -1
  let line = 0
  let isDirty = dirty

  if (isDirty) {
    savepointName = generateSavepointName('execmultisql')
    setSavepoint(session, savepointName)
  }
  for (const st of iterStatements(query)) {
    line++
    const pct = Math.floor((st.start * 100) / total)
    if (progress && pct > lastProgress) {
      lastProgress = pct
      if (!progress(pct)) {
        if (savepointName) revertToSavepoint(session, savepointName)
        throw new Error('Action cancelled.')
      }
    }
    const head = st.text.trimStart().slice(0, 8).toUpperCase()
    const isTransactionControl =
      head.startsWith('COMMIT') ||
      head.startsWith('END ') ||
      head.startsWith('END;') ||
      head.startsWith('BEGIN ') ||
      head.startsWith('BEGIN;') ||
      head === 'END' ||
      head === 'BEGIN'
    if (isTransactionControl) {
      if (!savepointName) {
        savepointName = generateSavepointName('execmultisql')
        setSavepoint(session, savepointName)
        isDirty = true
      }
      continue
    }
    if (!session.structureChecksDisabled && startsWithStructurePrefix(st.text)) structureUpdated = true
    try {
      runStatement(session, st.text)
    } catch (err) {
      const rollback = isDirty ? ' and rolling back' : ''
      const message = `Error in statement #${line}: ${(err as Error).message}.\nAborting execution${rollback}.`
      if (isDirty && savepointName) revertToSavepoint(session, savepointName)
      if (structureUpdated) updateSchema(session)
      throw new Error(message, { cause: err })
    }
  }
  progress?.(100)
  if (structureUpdated) updateSchema(session)
}

/** First column of the first row, or null. */
export function querySingleValue(
  session: DbSession,
  sql: string,
  { log = true, params = [] }: { log?: boolean; params?: readonly SqlValue[] } = {},
): SqlValue {
  if (log) logSql(session, sql)
  let result: StatementResult
  try {
    result = runStatement(session, sql, params)
  } catch (err) {
    throw new Error(`could not execute command: ${(err as Error).message}`, { cause: err })
  }
  return result.rows?.[0]?.[0] ?? null
}
