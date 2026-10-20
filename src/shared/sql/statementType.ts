// Port of reference/sqliteview/core/runsql.py (StatementType, statement_type, returns_rows).
// Pure: the worker classifies statements while running; the renderer to ask before committing.

export type StatementType =
  | 'SELECT'
  | 'ALTER'
  | 'DROP'
  | 'ROLLBACK'
  | 'PRAGMA'
  | 'VACUUM'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'ATTACH'
  | 'DETACH'
  | 'ANALYZE'
  | 'EXPLAIN'
  | 'WITH'
  | 'VALUES'
  | 'OTHER'

const KNOWN = new Set<string>([
  'SELECT',
  'ALTER',
  'DROP',
  'ROLLBACK',
  'PRAGMA',
  'VACUUM',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'ATTACH',
  'DETACH',
  'ANALYZE',
  'EXPLAIN',
  'WITH',
  'VALUES',
])

const LEADING_COMMENTS = /^(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?(?:\*\/|$))*/
const CTE_WRITE = /\)\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i

export function stripLeadingComments(sql: string): string {
  return sql.slice(LEADING_COMMENTS.exec(sql)?.[0].length ?? 0)
}

export function statementType(sql: string): StatementType {
  const word = /^[A-Za-z]+/.exec(stripLeadingComments(sql))?.[0].toUpperCase()
  if (!word) return 'OTHER'
  if (word === 'REPLACE') return 'INSERT'
  return KNOWN.has(word) ? (word as StatementType) : 'OTHER'
}

/** Reader statements are shown in the result grid, which loads them lazily (like upstream). */
export function returnsRows(sql: string, type: StatementType = statementType(sql)): boolean {
  if (type === 'SELECT' || type === 'EXPLAIN' || type === 'VALUES') return true
  if (type === 'PRAGMA') return !sql.includes('=')
  if (type === 'WITH') return !CTE_WRITE.test(sql)
  return false
}

/** PRAGMA assignments (except defer_foreign_keys) and VACUUM commit pending changes first. */
export function needsCommitFirst(sql: string, type: StatementType = statementType(sql)): boolean {
  return (
    (type === 'PRAGMA' && sql.includes('=') && !sql.toLowerCase().includes('defer_foreign_keys')) ||
    type === 'VACUUM'
  )
}

/** Statements that change the schema, so the explorer has to re-read it. */
export function changesStructure(type: StatementType): boolean {
  return ['ALTER', 'CREATE', 'DROP', 'ROLLBACK', 'ATTACH', 'DETACH', 'ANALYZE'].includes(type)
}

const BEGIN = /^BEGIN(\s+(DEFERRED|IMMEDIATE|EXCLUSIVE))?(\s+TRANSACTION)?\s*;?$/i
const COMMIT = /^(COMMIT|END)(\s+TRANSACTION)?\s*;?$/i

/** Upstream skips BEGIN/COMMIT: the app manages the transaction with savepoints. */
export function isTransactionControl(sql: string): boolean {
  const s = stripLeadingComments(sql).trim()
  return BEGIN.test(s) || COMMIT.test(s)
}
