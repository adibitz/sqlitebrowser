// Port of TableTab.browse_settings / apply_browse_settings: a tab's browse state <-> the table
// settings of a project file, which address columns by position (as upstream does).
import { tokenizeGlobalFilter } from '@shared/format/filters'
import { emptyTableSettings, type TableSettings } from '@shared/project/sqbpro'
import type { SortSpec } from '@shared/types/rows'
import type { BrowseState } from '@/store/tabs'

const ROWID = '_rowid_'

export function browseToSettings(browse: BrowseState, columns: readonly string[]): TableSettings {
  const s = emptyTableSettings()
  s.unlockViewPk = browse.pseudoPk[0] ?? ROWID
  for (const { column, direction } of browse.sort) {
    const index = columns.indexOf(column)
    if (index >= 0) s.sort.push([index, direction === 'asc' ? 0 : 1])
  }
  for (const [column, text] of Object.entries(browse.filters)) {
    const index = columns.indexOf(column)
    if (index >= 0 && text) s.filters[index] = text
  }
  // Model columns: 0 is the rowid, so the first field is 1.
  for (const [column, width] of Object.entries(browse.columnWidths)) {
    const index = columns.indexOf(column)
    if (index >= 0 && !browse.hiddenColumns.includes(column)) s.columnWidths[index + 1] = width
  }
  s.globalFilters = tokenizeGlobalFilter(browse.globalFilter)
  return s
}

export function settingsToBrowse(s: TableSettings, columns: readonly string[]): Partial<BrowseState> {
  const named = <T>(entries: [string | number, T][], shift = 0): Record<string, T> =>
    Object.fromEntries(
      entries.flatMap(([index, value]) => {
        const column = columns[Number(index) - shift]
        return column === undefined ? [] : [[column, value]]
      }),
    )
  const sort: SortSpec[] = s.sort.flatMap(([index, mode]) => {
    const column = columns[index]
    return column === undefined ? [] : [{ column, direction: mode ? 'desc' : 'asc' }]
  })
  return {
    filters: named(Object.entries(s.filters)),
    sort,
    globalFilter: s.globalFilters.join(' '),
    columnWidths: named(
      Object.entries(s.columnWidths).filter(([, width]) => width > 0),
      1,
    ),
    pseudoPk: s.unlockViewPk !== ROWID && columns.includes(s.unlockViewPk) ? [s.unlockViewPk] : [],
    page: 0,
  }
}
