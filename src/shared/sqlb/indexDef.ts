// Port of reference/sqliteview/core/sqlb.py (Index).
import { escapeIdentifier, ObjectIdentifier } from './identifier'
import type { IndexedColumn } from './indexedColumn'
import { SchemaObject } from './table'

export class Index extends SchemaObject {
  readonly kind = 'index'
  fields: IndexedColumn[] = []
  unique = false
  table = ''
  whereExpr = ''

  override baseTable(): string {
    return this.table
  }

  findField(name: string): IndexedColumn | null {
    const lname = name.toLowerCase()
    return this.fields.find((c) => c.name.toLowerCase() === lname) ?? null
  }

  removeField(name: string): boolean {
    const lname = name.toLowerCase()
    const i = this.fields.findIndex((c) => c.name.toLowerCase() === lname)
    if (i < 0) return false
    this.fields.splice(i, 1)
    return true
  }

  sql(schema = 'main', ifNotExists = false): string {
    let s = this.unique ? 'CREATE UNIQUE INDEX ' : 'CREATE INDEX '
    if (ifNotExists) s += 'IF NOT EXISTS '
    s += new ObjectIdentifier(schema, this.name).toString(true)
    s += ' ON ' + escapeIdentifier(this.table) + ' (\n'
    s += this.fields.map((c) => c.toString()).join(',\n')
    s += '\n)'
    if (this.whereExpr) s += ' WHERE ' + this.whereExpr
    return s + ';'
  }

  clone(): Index {
    const i = new Index(this.name)
    i.originalSql = this.originalSql
    i.fullyParsed = this.fullyParsed
    i.fields = this.fields.map((c) => c.clone())
    i.unique = this.unique
    i.table = this.table
    i.whereExpr = this.whereExpr
    return i
  }
}
