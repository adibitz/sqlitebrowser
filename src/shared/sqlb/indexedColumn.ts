// Port of reference/sqliteview/core/sqlb.py (IndexedColumn, join_indexed_columns).
import { escapeIdentifier } from './identifier'

/** A column (or expression) in an index or a PRIMARY KEY / UNIQUE constraint. */
export class IndexedColumn {
  constructor(
    public name = '',
    public isExpression = false,
    /** '', 'ASC' or 'DESC' */
    public order = '',
  ) {}

  matches(name: string): boolean {
    return !this.isExpression && this.name === name
  }

  toString(indent = '\t', sep = '\t'): string {
    const n = this.isExpression ? this.name : escapeIdentifier(this.name)
    return indent + n + (this.order ? sep + this.order : '')
  }

  clone(): IndexedColumn {
    return new IndexedColumn(this.name, this.isExpression, this.order)
  }
}

export function joinIndexedColumns(cols: readonly IndexedColumn[], delim: string): string {
  return cols.map((c) => c.toString('', ' ')).join(delim)
}
