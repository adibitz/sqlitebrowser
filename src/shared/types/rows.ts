import type { ObjectRef } from './schema'

export type SortDirection = 'asc' | 'desc'

export interface SortSpec {
  column: string
  direction: SortDirection
}

/** What the data grid shows of a table or view: filters and sort, in the filter-row syntax. */
export interface BrowseQuery {
  table: ObjectRef
  /** column name -> filter text ('>5', '=NULL', 'abc', …) */
  filters: Record<string, string>
  /** Space-separated terms matched against every column. */
  globalFilter: string
  sort: SortSpec[]
  /** Key columns chosen to edit a view (upstream's "pseudo primary key"); empty for tables. */
  pseudoPk: string[]
  /** LIKE escape character ('databrowser/filter_escape'). */
  filterEscape: string
  /** column -> SQL expression shown instead of the column (display formats); filters apply to it. */
  displayFormats: Record<string, string>
  /**
   * Conditional formats. Each row gets one extra value per entry, after the columns: the index of the
   * first filter its value matches, or NULL.
   */
  condFormats: { column: string; filters: string[] }[]
}

/** Column 0 of every row is its key: rowid, primary key, or combined key (sqlb_make_single_value). */
export const KEY_COLUMN = 0
