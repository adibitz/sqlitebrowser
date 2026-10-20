// Port of reference/sqliteview/core/db.py (_expand_sql).
import { sqlLiteral } from '../format/sqlLiteral'
import type { SqlValue } from '../types/values'

const LOG_VALUE_LIMIT = 200

/** Rough sqlite3_expanded_sql for the SQL log: '?' placeholders replaced by literals. */
export function expandSql(sql: string, params: readonly SqlValue[]): string {
  let i = 0
  return sql.replace(/\?/g, () => {
    const v = params[i++] ?? null
    return typeof v === 'string' && v.length > LOG_VALUE_LIMIT
      ? sqlLiteral(v.slice(0, LOG_VALUE_LIMIT) + '…')
      : sqlLiteral(v)
  })
}
