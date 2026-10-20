// Port of reference/sqliteview/core/db.py (get_pragma, set_pragma).
import type { SqlValue } from '@shared/types/values'
import { escapeString } from '@shared/sqlb/identifier'
import { executeSql, querySingleValue } from './execute'
import { releaseSavepoint } from './savepoints'
import type { DbSession } from './session'

export function getPragma(session: DbSession, pragma: string): SqlValue {
  if (pragma === 'case_sensitive_like') return querySingleValue(session, "SELECT 'x' NOT LIKE 'X';")
  return querySingleValue(session, `PRAGMA ${pragma};`)
}

/**
 * Most pragmas can't be rolled back or fail inside transactions, so pending changes are committed
 * first (upstream behaviour). page_size and auto_vacuum only apply after a VACUUM.
 */
export function setPragma(session: DbSession, pragma: string, value: SqlValue): void {
  if (pragma !== 'defer_foreign_keys') releaseSavepoint(session)
  executeSql(session, `PRAGMA ${pragma} = ${escapeString(String(value))};`, { dirty: false, log: true })
  if (pragma === 'page_size' || pragma === 'auto_vacuum') {
    executeSql(session, 'VACUUM;', { dirty: false, log: true })
  }
}
