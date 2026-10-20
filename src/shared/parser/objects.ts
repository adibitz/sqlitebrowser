// Port of reference/sqliteview/core/parser.py (parse_view, parse_trigger).
import { View } from '../sqlb/table'
import { Trigger } from '../sqlb/trigger'

/** Views keep their SQL as written; their columns come from PRAGMA table_info. */
export function parseView(sql: string): View {
  const v = new View('')
  v.originalSql = sql
  return v
}

export function parseTrigger(sql: string): Trigger {
  const t = new Trigger('')
  t.originalSql = sql
  return t
}
