// Port of reference/sqliteview/core/sqlb.py (Object, Table, View).
import { CheckConstraint, ForeignKeyClause, PrimaryKeyConstraint, type UniqueConstraint } from './constraints'
import type { Field } from './field'
import { ObjectIdentifier } from './identifier'
import { IndexedColumn } from './indexedColumn'

export type ObjectKind = 'table' | 'view' | 'index' | 'trigger'

/** Common shape of tables, views, indices and triggers. */
export abstract class SchemaObject {
  abstract readonly kind: ObjectKind
  originalSql = ''
  fullyParsed = false

  constructor(public name = '') {}

  abstract sql(schema?: string, ifNotExists?: boolean): string
  abstract clone(): SchemaObject

  baseTable(): string {
    return ''
  }
}

export interface IndexConstraintEntry {
  columns: IndexedColumn[]
  constraint: UniqueConstraint
}

export interface ForeignKeyEntry {
  columns: string[]
  clause: ForeignKeyClause
}

export class Table extends SchemaObject {
  readonly kind: 'table' | 'view' = 'table'
  fields: Field[] = []
  /** PRIMARY KEY and UNIQUE table constraints. */
  indexConstraints: IndexConstraintEntry[] = []
  foreignKeys: ForeignKeyEntry[] = []
  checkConstraints: CheckConstraint[] = []
  virtualUsing = ''
  withoutRowid = false
  strict = false

  /** Structural equality (the Python __eq__): everything except the original SQL. */
  equals(other: Table): boolean {
    return structureKey(this) === structureKey(other)
  }

  isView(): boolean {
    return false
  }
  isVirtual(): boolean {
    return !!this.virtualUsing
  }

  fieldNames(): string[] {
    return this.fields.map((f) => f.name)
  }

  findField(name: string): Field | null {
    const lname = name.toLowerCase()
    return this.fields.find((f) => f.name.toLowerCase() === lname) ?? null
  }

  fieldIndex(name: string): number {
    const lname = name.toLowerCase()
    return this.fields.findIndex((f) => f.name.toLowerCase() === lname)
  }

  removeField(name: string): boolean {
    const i = this.fieldIndex(name)
    if (i < 0) return false
    this.fields.splice(i, 1)
    return true
  }

  rowidColumns(): string[] {
    if (this.withoutRowid) return this.primaryKeyColumns().map((c) => c.name)
    return ['_rowid_']
  }

  primaryKey(): PrimaryKeyConstraint | null {
    for (const { constraint } of this.indexConstraints) {
      if (constraint.isPrimaryKey()) return constraint
    }
    return null
  }

  primaryKeyColumns(): IndexedColumn[] {
    return this.indexConstraints.find((e) => e.constraint.isPrimaryKey())?.columns ?? []
  }

  primaryKeyNames(): string[] {
    return this.primaryKeyColumns().map((c) => c.name)
  }

  addIndexConstraint(columns: (IndexedColumn | string)[], constraint: UniqueConstraint): void {
    const cols = columns.map((c) => (c instanceof IndexedColumn ? c : new IndexedColumn(c, false)))
    this.indexConstraints.push({ columns: cols, constraint })
  }

  addForeignKey(columns: (IndexedColumn | string)[], clause: ForeignKeyClause): void {
    const cols = columns.map((c) => (c instanceof IndexedColumn ? c.name : c))
    this.foreignKeys.push({ columns: cols, clause })
  }

  removeConstraint(constraint: UniqueConstraint | ForeignKeyClause | CheckConstraint): void {
    if (constraint instanceof CheckConstraint) {
      this.checkConstraints = this.checkConstraints.filter((c) => c !== constraint)
    } else if (constraint instanceof ForeignKeyClause) {
      this.foreignKeys = this.foreignKeys.filter((e) => e.clause !== constraint)
    } else {
      this.indexConstraints = this.indexConstraints.filter((e) => e.constraint !== constraint)
    }
  }

  foreignKey(columns: readonly string[]): ForeignKeyClause | null {
    const entry = this.foreignKeys.find(
      (e) => e.columns.length === columns.length && e.columns.every((c, i) => c === columns[i]),
    )
    return entry?.clause ?? null
  }

  /** Replaces the PK column list (keeping its other properties); drops the PK when empty. */
  setPrimaryKeyColumns(names: readonly string[], autoIncrement?: boolean): void {
    let pk = this.primaryKey()
    if (!names.length) {
      if (pk) this.removeConstraint(pk)
      return
    }
    if (!pk) {
      pk = new PrimaryKeyConstraint()
      this.indexConstraints.unshift({
        columns: names.map((n) => new IndexedColumn(n, false)),
        constraint: pk,
      })
    } else {
      for (const entry of this.indexConstraints) {
        if (entry.constraint !== pk) continue
        const old = new Map(entry.columns.map((c) => [c.name, c]))
        entry.columns = names.map((n) => old.get(n) ?? new IndexedColumn(n, false))
      }
    }
    if (autoIncrement !== undefined) pk.autoIncrement = autoIncrement
  }

  removeKeyFromAllConstraints(key: string): void {
    this.indexConstraints = this.indexConstraints
      .map((e) => ({ ...e, columns: e.columns.filter((c) => !c.matches(key)) }))
      .filter((e) => e.columns.length > 0)
    this.foreignKeys = this.foreignKeys
      .map((e) => ({ ...e, columns: e.columns.filter((c) => c !== key) }))
      .filter((e) => e.columns.length > 0)
  }

  renameKeyInAllConstraints(key: string, to: string): void {
    if (key === to) return
    for (const { columns } of this.indexConstraints) {
      for (const c of columns) if (c.matches(key)) c.name = to
    }
    for (const entry of this.foreignKeys) entry.columns = entry.columns.map((c) => (c === key ? to : c))
  }

  sql(schema = 'main', ifNotExists = false): string {
    if (this.isVirtual()) {
      return `CREATE VIRTUAL TABLE ${new ObjectIdentifier(schema, this.name).toString(true)} USING ${this.virtualUsing};`
    }
    let s = 'CREATE TABLE '
    if (ifNotExists) s += 'IF NOT EXISTS '
    s += new ObjectIdentifier(schema, this.name).toString(true) + ' (\n'
    s += this.fields.map((f) => f.toString()).join(',\n')
    for (const { columns, constraint } of this.indexConstraints) s += ',\n\t' + constraint.toSql(columns)
    for (const { columns, clause } of this.foreignKeys) s += ',\n\t' + clause.toSql(columns)
    for (const c of this.checkConstraints) s += ',\n\t' + c.toSql()
    s += '\n)'
    const opts: string[] = []
    if (this.withoutRowid) opts.push('WITHOUT ROWID')
    if (this.strict) opts.push('STRICT')
    if (opts.length) s += ' ' + opts.join(',')
    return s + ';'
  }

  clone(): Table {
    return copyTableInto(this, new Table(this.name))
  }
}

export class View extends Table {
  override readonly kind = 'view'

  override isView(): boolean {
    return true
  }

  override sql(): string {
    return this.originalSql
  }

  override clone(): View {
    return copyTableInto(this, new View(this.name))
  }
}

function copyTableInto<T extends Table>(from: Table, to: T): T {
  to.originalSql = from.originalSql
  to.fullyParsed = from.fullyParsed
  to.fields = from.fields.map((f) => f.clone())
  to.indexConstraints = from.indexConstraints.map((e) => ({
    columns: e.columns.map((c) => c.clone()),
    constraint: e.constraint.clone(),
  }))
  to.foreignKeys = from.foreignKeys.map((e) => ({ columns: [...e.columns], clause: e.clause.clone() }))
  to.checkConstraints = from.checkConstraints.map((c) => new CheckConstraint(c.expression, c.name))
  to.virtualUsing = from.virtualUsing
  to.withoutRowid = from.withoutRowid
  to.strict = from.strict
  return to
}

function structureKey(t: Table): string {
  return JSON.stringify([
    t.kind,
    t.name,
    t.fullyParsed,
    t.withoutRowid,
    t.strict,
    t.virtualUsing,
    t.fields,
    t.indexConstraints,
    t.foreignKeys,
    t.checkConstraints,
  ])
}
