// Port of reference/sqliteview/core/sqlb.py (Trigger).
import { SchemaObject } from './table'

export class Trigger extends SchemaObject {
  readonly kind = 'trigger'
  table = ''

  override baseTable(): string {
    return this.table
  }

  sql(): string {
    return this.originalSql
  }

  clone(): Trigger {
    const t = new Trigger(this.name)
    t.originalSql = this.originalSql
    t.fullyParsed = this.fullyParsed
    t.table = this.table
    return t
  }
}
