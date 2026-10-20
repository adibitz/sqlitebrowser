/** Plain, serialisable view of the database schema, sent from the DB worker to the UI. */

export interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  primaryKey: boolean
  unique: boolean
  defaultValue: string
  check: string
  collation: string
  /** e.g. `"customers"("id") ON DELETE CASCADE`, or null. */
  foreignKey: string | null
  /** e.g. 'STORED: id * 2' for generated columns, else null. */
  generated: string | null
}

export type TableKind = 'table' | 'view' | 'virtual' | 'system'

export interface TableInfo {
  schema: string
  name: string
  kind: TableKind
  columns: ColumnInfo[]
  /** CREATE statement as stored in sqlite_master ('' for automatic objects). */
  sql: string
  withoutRowid: boolean
  /** Columns that address a row: ['_rowid_'], or the primary key of a WITHOUT ROWID table. */
  rowidColumns: string[]
  autoIncrement: boolean
}

export interface IndexInfo {
  schema: string
  name: string
  table: string
  unique: boolean
  /** Column names or expressions, with ' ASC'/' DESC' when given. Empty for unparsed indices. */
  columns: string[]
  where: string
  sql: string
}

export interface TriggerInfo {
  schema: string
  name: string
  table: string
  sql: string
}

export interface SchemaInfo {
  /** 'main', 'temp' or the name an attached database was given. */
  name: string
  tables: TableInfo[]
  indices: IndexInfo[]
  triggers: TriggerInfo[]
}

/** Identifies a table or view across attached schemas. */
export interface ObjectRef {
  schema: string
  name: string
}

export function sameObject(a: ObjectRef, b: ObjectRef): boolean {
  return a.schema === b.schema && a.name === b.name
}

export function objectDisplayName(ref: ObjectRef): string {
  return ref.schema === 'main' ? ref.name : `${ref.schema}.${ref.name}`
}

export function findTable(schemata: SchemaInfo[], ref: ObjectRef): TableInfo | null {
  return schemata.find((s) => s.name === ref.schema)?.tables.find((t) => t.name === ref.name) ?? null
}

/**
 * Column changes of a table edit as [old, new] name pairs: [a, a] keep, [a, b] rename, [a, null]
 * drop, [null, b] add. Columns of the old table that aren't listed are kept.
 */
export type TrackColumns = [string | null, string | null][]
