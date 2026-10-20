import type { CondFormat } from '@shared/format/condFormat'
import type { SortSpec } from '@shared/types/rows'
import type { ColumnInfo, TableInfo } from '@shared/types/schema'
import type { BrowseState } from '@/store/tabs'
import { activeFormats } from './activeFormats'

export const DEFAULT_COLUMN_WIDTH = 160
export const MIN_COLUMN_WIDTH = 48

export interface GridColumn {
  name: string
  info: ColumnInfo
  /** Position of the value in a row array (0 is the row key). */
  dataIndex: number
  width: number
  numeric: boolean
  /** Shown through a display format: read-only, in the accent colour. */
  formatted?: boolean
  /** Conditional formats: where the row holds the index of the matching rule, and the rules. */
  condFormat?: { dataIndex: number; rules: CondFormat[] }
}

const NUMERIC_TYPE = /int|real|floa|doub|num|dec|bool/i

/** The columns the grid shows, in table order, without hidden ones. */
export function gridColumns(table: TableInfo, browse: BrowseState): GridColumn[] {
  const formats = activeFormats(table, browse)
  const firstMatch = table.columns.length + 1
  return table.columns
    .map((info, i) => {
      const cond = formats.condFormats.findIndex((c) => c.column === info.name)
      return {
        name: info.name,
        info,
        dataIndex: i + 1,
        width: browse.columnWidths[info.name] ?? DEFAULT_COLUMN_WIDTH,
        numeric: NUMERIC_TYPE.test(info.type),
        formatted: info.name in formats.displayFormats,
        ...(cond >= 0 && {
          condFormat: { dataIndex: firstMatch + cond, rules: formats.condFormats[cond]!.rules },
        }),
      }
    })
    .filter((c) => !browse.hiddenColumns.includes(c.name))
}

/** Header click: sort by this column ascending, then descending. With `add`, keep other sort columns. */
export function toggleSort(sort: SortSpec[], column: string, add: boolean): SortSpec[] {
  const current = sort.find((s) => s.column === column)
  const direction = current?.direction === 'asc' ? 'desc' : 'asc'
  if (!add) return [{ column, direction }]
  if (current) return sort.map((s) => (s.column === column ? { column, direction } : s))
  return [...sort, { column, direction: 'asc' }]
}

export function setSort(
  sort: SortSpec[],
  column: string,
  direction: SortSpec['direction'],
  add: boolean,
): SortSpec[] {
  if (!add) return [{ column, direction }]
  return [...sort.filter((s) => s.column !== column), { column, direction }]
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** "▲", "▼²" … (port of the header DisplayRole), '' when not sorted. */
export function sortIndicator(sort: SortSpec[], column: string): string {
  const i = sort.findIndex((s) => s.column === column)
  if (i < 0) return ''
  const arrow = sort[i]!.direction === 'asc' ? '▲' : '▼'
  return sort.length > 1 ? arrow + [...String(i + 1)].map((d) => SUPERSCRIPT[Number(d)]).join('') : arrow
}

/** Width of the row-number gutter for the largest row number shown. */
export function gutterWidth(lastRowNumber: number): number {
  return Math.max(48, String(lastRowNumber).length * 8 + 28)
}
