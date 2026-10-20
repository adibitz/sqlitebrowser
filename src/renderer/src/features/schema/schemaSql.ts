// Port of reference/sqliteview/ui/schema_tab.py (schema_sql).
import type { ObjectRef, SchemaInfo } from '@shared/types/schema'

function statement(sql: string): string {
  return sql.trim().replace(/;+$/, '') + ';'
}

const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase())

/**
 * CREATE statements for every object of the database, or for one table/view and (optionally) its
 * indices and triggers. Automatic indices have no SQL and are skipped.
 */
export function schemaSql(schemata: SchemaInfo[], scope: ObjectRef | null, includeRelated = true): string {
  const parts: string[] = []
  for (const s of schemata) {
    if (scope && s.name !== scope.schema) continue
    const prefix = s.name === 'main' ? '' : `${s.name}.`
    let tables = s.tables.filter((t) => !t.name.startsWith('sqlite_') && t.sql).sort(byName)
    if (scope) tables = tables.filter((t) => t.name === scope.name)
    const names = new Set(tables.map((t) => t.name))
    for (const [label, isView] of [
      ['Table', false],
      ['View', true],
    ] as const) {
      for (const t of tables) {
        if ((t.kind === 'view') === isView) parts.push(`-- ${label}: ${prefix}${t.name}\n${statement(t.sql)}`)
      }
    }
    if (!includeRelated) continue
    for (const [label, objects] of [
      ['Index', s.indices],
      ['Trigger', s.triggers],
    ] as const) {
      for (const o of [...objects].sort(byName)) {
        if (!o.sql || (scope && !names.has(o.table))) continue
        parts.push(`-- ${label}: ${prefix}${o.name}  (on ${o.table})\n${statement(o.sql)}`)
      }
    }
  }
  return parts.length ? parts.join('\n\n') + '\n' : ''
}
