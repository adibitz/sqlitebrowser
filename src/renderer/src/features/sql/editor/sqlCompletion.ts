import type { SQLNamespace } from '@codemirror/lang-sql'
import type { SchemaInfo } from '@shared/types/schema'

/**
 * Tables and their columns for autocompletion (port of SqlEditor.set_schema): main tables by name,
 * attached databases as schema.table.
 */
export function completionNamespace(schemata: SchemaInfo[]): SQLNamespace {
  const ns: Record<string, Record<string, string[]>> = {}
  for (const s of schemata) {
    const tables: Record<string, string[]> = {}
    for (const t of s.tables) {
      if (t.kind === 'system') continue
      tables[t.name] = t.columns.map((c) => c.name)
    }
    ns[s.name] = tables
  }
  return ns
}
