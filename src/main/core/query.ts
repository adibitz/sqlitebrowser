// Port of reference/sqliteview/core/query.py (upstream src/sql/Query.cpp): SELECT builder for browsing.
import { escapeIdentifier, ObjectIdentifier } from '@shared/sqlb/identifier'

export enum SortDirection {
  Ascending = 0,
  Descending = 1,
}

export class OrderBy {
  constructor(
    public expr: string,
    public direction = SortDirection.Ascending,
    public isExpression = false,
  ) {}

  toSql(): string {
    const d = this.direction === SortDirection.Ascending ? ' ASC' : ' DESC'
    return (this.isExpression ? this.expr : escapeIdentifier(this.expr)) + d
  }
}

/** A column shown under its original name but read through another expression (display formats). */
export interface SelectedColumn {
  originalColumn: string
  selector: string
}

export class Query {
  isView = false
  columnNames: string[] = []
  rowidColumns: string[] = ['_rowid_']
  selectedColumns: SelectedColumn[] = []
  /** column -> condition, e.g. "LIKE '%a%'" */
  where = new Map<string, string>()
  globalWhere: string[] = []
  orderBy: OrderBy[] = []
  /** Expressions selected after the columns (the conditional format matches). */
  extraColumns: string[] = []

  constructor(public table = new ObjectIdentifier()) {}

  hasCustomRowidColumn(): boolean {
    return this.rowidColumns.length !== 1 || !['rowid', '_rowid_'].includes(this.rowidColumns[0]!)
  }

  /** How a column is read: its display format, or the quoted name. */
  selectorFor(name: string): string {
    const c = this.selectedColumns.find((s) => s.originalColumn === name && s.selector !== name)
    return c ? c.selector : escapeIdentifier(name)
  }

  buildWherePart(): string {
    if (!this.where.size && !this.globalWhere.length) return ''
    const parts = [...this.where].map(([col, cond]) => `${this.selectorFor(col)} ${cond}`)
    for (const w of this.globalWhere) {
      const ors = this.columnNames.map((c) => `${this.selectorFor(c)} ${w}`).join(' OR ')
      parts.push(`(${ors})`)
    }
    return 'WHERE ' + parts.join(' AND ')
  }

  buildQuery(withRowid: boolean): string {
    let selector = ''
    if (withRowid) {
      if (this.rowidColumns.length === 1) {
        selector =
          this.isView && !this.hasCustomRowidColumn()
            ? 'NULL,'
            : escapeIdentifier(this.rowidColumns[0]!) + ','
      } else {
        selector = 'sqlb_make_single_value(' + this.rowidColumns.map(escapeIdentifier).join(',') + '),'
      }
    }
    if (!this.selectedColumns.length) {
      selector += '*'
    } else {
      selector += this.selectedColumns
        .map((c) =>
          c.originalColumn !== c.selector
            ? `${c.selector} AS ${escapeIdentifier(c.originalColumn)}`
            : escapeIdentifier(c.originalColumn),
        )
        .join(',')
    }
    if (this.extraColumns.length) selector += ',' + this.extraColumns.join(',')
    let orderBy = this.orderBy.map((o) => o.toSql()).join(',')
    if (orderBy) orderBy = 'ORDER BY ' + orderBy
    return `SELECT ${selector} FROM ${this.table.toString()} ${this.buildWherePart()} ${orderBy}`
  }

  buildCountQuery(): string {
    return `SELECT COUNT(*) FROM ${this.table.toString()} ${this.buildWherePart()}`
  }
}
