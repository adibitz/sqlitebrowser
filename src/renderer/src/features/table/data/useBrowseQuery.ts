import { useMemo } from 'react'
import type { BrowseQuery } from '@shared/types/rows'
import type { TableInfo } from '@shared/types/schema'
import { useSetting } from '@/store/settings'
import type { BrowseState } from '@/store/tabs'
import { activeFormats } from './activeFormats'

/** The query the worker runs for a tab's filters, sort and formats (of columns that still exist). */
export function useBrowseQuery(table: TableInfo, browse: BrowseState): BrowseQuery {
  const filterEscape = useSetting('databrowser/filter_escape') ?? '\\'
  const { filters, globalFilter, sort, pseudoPk, displayFormats, condFormats } = browse
  const { schema, name, columns } = table
  return useMemo(() => {
    const names = new Set(columns.map((c) => c.name))
    const formats = activeFormats({ columns }, { displayFormats, condFormats })
    return {
      table: { schema, name },
      filters: Object.fromEntries(Object.entries(filters).filter(([column]) => names.has(column))),
      globalFilter,
      sort: sort.filter((s) => names.has(s.column)),
      pseudoPk: pseudoPk.filter((c) => names.has(c)),
      filterEscape,
      displayFormats: formats.displayFormats,
      condFormats: formats.condFormats.map((c) => ({
        column: c.column,
        filters: c.rules.map((r) => r.filter),
      })),
    }
  }, [
    schema,
    name,
    columns,
    filters,
    globalFilter,
    sort,
    pseudoPk,
    filterEscape,
    displayFormats,
    condFormats,
  ])
}
