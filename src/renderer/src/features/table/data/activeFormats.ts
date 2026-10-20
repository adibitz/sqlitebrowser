import type { CondFormat } from '@shared/format/condFormat'
import type { TableInfo } from '@shared/types/schema'
import type { BrowseState } from '@/store/tabs'

export interface ColumnCondFormats {
  column: string
  rules: CondFormat[]
}

/**
 * The display and conditional formats that apply to the table as it is now: formats of columns that
 * were renamed or dropped are left out. The order of `condFormats` is the order of the match values
 * at the end of each row.
 */
export function activeFormats(
  table: Pick<TableInfo, 'columns'>,
  browse: Pick<BrowseState, 'displayFormats' | 'condFormats'>,
): { displayFormats: Record<string, string>; condFormats: ColumnCondFormats[] } {
  const names = new Set(table.columns.map((c) => c.name))
  return {
    displayFormats: Object.fromEntries(
      Object.entries(browse.displayFormats).filter(([column, selector]) => names.has(column) && selector),
    ),
    condFormats: table.columns
      .map((c) => ({ column: c.name, rules: browse.condFormats[c.name] ?? [] }))
      .filter((c) => c.rules.length),
  }
}
