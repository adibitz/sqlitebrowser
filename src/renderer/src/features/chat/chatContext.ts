// What the user is looking at, in words, for the model (sent with each message).
import { describeFilter } from '@shared/format/filters'
import { objectDisplayName } from '@shared/types/schema'
import type { DocTab } from '@/store/tabs'

const MAX_SQL = 1500

export function describeTab(tab: DocTab | undefined): string | null {
  if (!tab) return null
  if (tab.kind === 'table') {
    const { filters, globalFilter, sort } = tab.browse
    const parts = [
      ...Object.entries(filters).map(([column, text]) => `${column} ${describeFilter(text)}`),
      ...(globalFilter ? [`searching "${globalFilter}"`] : []),
      ...(sort.length ? [`sorted by ${sort.map((s) => `${s.column} ${s.direction}`).join(', ')}`] : []),
    ]
    return `the ${tab.view} of table ${objectDisplayName(tab.object)}${parts.length ? ` (${parts.join('; ')})` : ''}`
  }
  if (tab.kind === 'sql') {
    const sql = tab.text.trim()
    if (!sql) return `an empty SQL editor`
    return `the SQL editor "${tab.name}" containing:\n${sql.length > MAX_SQL ? sql.slice(0, MAX_SQL) + '…' : sql}`
  }
  if (tab.kind === 'info') return 'the Database info tab'
  return tab.object ? `the schema of ${objectDisplayName(tab.object)}` : 'the database schema'
}
