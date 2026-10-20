// Port of reference/sqliteview/ui/dialogs/edit_table.py (the edits of EditTableDialog).
// The dialog edits a copy of the shared sqlb Table plus the [old, new] column pairs that
// alterTable needs; every edit returns a new draft so React state stays immutable.
import { parseForeignKeyClause, parseTable } from '@shared/parser/createTable'
import { Field } from '@shared/sqlb/field'
import { Table } from '@shared/sqlb/table'
import type { TrackColumns } from '@shared/types/schema'

export const DATATYPES = ['INTEGER', 'TEXT', 'BLOB', 'REAL', 'NUMERIC']
export const DATATYPES_STRICT = ['INT', 'INTEGER', 'TEXT', 'BLOB', 'REAL', 'ANY']

export interface TableDraft {
  table: Table
  schema: string
  track: TrackColumns
}

/** Result of an edit the user may have to correct (duplicate name, unreadable foreign key). */
export interface EditResult {
  draft: TableDraft
  error?: string
}

export type ColumnPatch = Partial<
  Pick<Field, 'type'> & {
    notNull: boolean
    unique: boolean
    defaultValue: string
    check: string
    collation: string
  }
>

export function emptyDraft(schema = 'main'): TableDraft {
  return { table: new Table(''), schema, track: [] }
}

/** A draft of an existing table from the engine's CREATE statement for it. */
export function draftFromSql(sql: string, schema: string): TableDraft {
  const table = parseTable(sql)
  return { table, schema, track: table.fields.map((f) => [f.name, f.name]) }
}

function edit(d: TableDraft, fn: (t: Table) => TrackColumns | void): TableDraft {
  const table = d.table.clone()
  const track = d.track.map(([o, n]): [string | null, string | null] => [o, n])
  const next = fn(table) ?? track
  // AUTOINCREMENT only fits a single INTEGER primary key (_refresh_ai_enabled).
  const pk = table.primaryKey()
  if (pk?.autoIncrement && !canAutoIncrement(table, table.primaryKeyNames()[0] ?? ''))
    pk.autoIncrement = false
  return { ...d, table, track: next }
}

export function canAutoIncrement(table: Table, column: string): boolean {
  const pk = table.primaryKeyNames()
  return pk.length === 1 && pk[0] === column && table.findField(column)?.type.toUpperCase() === 'INTEGER'
}

export function setTableName(d: TableDraft, name: string): TableDraft {
  return edit(d, (t) => {
    t.name = name.trim()
  })
}

export function setSchema(d: TableDraft, schema: string): TableDraft {
  return { ...d, schema }
}

export function setOptions(d: TableDraft, options: { withoutRowid?: boolean; strict?: boolean }): TableDraft {
  return edit(d, (t) => {
    t.withoutRowid = options.withoutRowid ?? t.withoutRowid
    t.strict = options.strict ?? t.strict
  })
}

export function addColumn(d: TableDraft): TableDraft {
  const names = new Set(d.table.fields.map((f) => f.name.toLowerCase()))
  let n = d.table.fields.length + 1
  while (names.has(`field${n}`)) n++
  const name = `Field${n}`
  return edit(d, (t) => {
    t.fields.push(new Field(name, 'INTEGER'))
    return [...d.track, [null, name]]
  })
}

export function removeColumn(d: TableDraft, index: number): TableDraft {
  const name = d.table.fields[index]?.name
  if (name === undefined) return d
  return edit(d, (t) => {
    t.removeKeyFromAllConstraints(name)
    t.fields.splice(index, 1)
    // A column added in this dialog just disappears; an existing one is dropped.
    return d.track.flatMap(([o, n]): TrackColumns => (n !== name ? [[o, n]] : o !== null ? [[o, null]] : []))
  })
}

export function moveColumn(d: TableDraft, index: number, delta: number): TableDraft {
  const target = index + delta
  if (index < 0 || target < 0 || target >= d.table.fields.length) return d
  return edit(d, (t) => {
    const fields = t.fields
    ;[fields[index], fields[target]] = [fields[target]!, fields[index]!]
  })
}

export function renameColumn(d: TableDraft, index: number, newName: string): EditResult {
  const name = newName.trim()
  const old = d.table.fields[index]?.name
  if (old === undefined || !name || name === old) return { draft: d }
  if (d.table.fields.some((f, i) => i !== index && f.name.toLowerCase() === name.toLowerCase())) {
    return { draft: d, error: `There already is a column named '${name}'.` }
  }
  const draft = edit(d, (t) => {
    t.fields[index]!.name = name
    t.renameKeyInAllConstraints(old, name)
    return d.track.map(([o, n]) => [o, n === old ? name : n])
  })
  return { draft }
}

export function updateColumn(d: TableDraft, index: number, patch: ColumnPatch): TableDraft {
  return edit(d, (t) => {
    const f = t.fields[index]
    if (!f) return
    if (patch.type !== undefined) f.type = patch.type.trim()
    if (patch.notNull !== undefined) f.setNotNull(patch.notNull)
    if (patch.unique !== undefined) f.setUnique(patch.unique)
    if (patch.defaultValue !== undefined && !f.generated) f.setDefault(patch.defaultValue.trim())
    if (patch.check !== undefined) f.setCheck(patch.check.trim())
    if (patch.collation !== undefined) f.setCollation(patch.collation.trim())
  })
}

/** The Foreign Key cell: `table(column) [ON DELETE …]`, or empty to remove it. */
export function setColumnForeignKey(d: TableDraft, index: number, text: string): EditResult {
  const f = d.table.fields[index]
  if (!f) return { draft: d }
  const fk = parseForeignKeyClause(text)
  if (text.trim() && !fk) {
    return { draft: d, error: 'Foreign key must look like: table(column) [ON DELETE CASCADE …]' }
  }
  const draft = edit(d, (t) => {
    const existing = t.foreignKey([f.name])
    if (existing) t.removeConstraint(existing)
    if (fk) t.addForeignKey([f.name], fk)
  })
  return { draft }
}

/** Ticks or clears the PK box of a column (_apply_pk). */
export function togglePrimaryKey(d: TableDraft, index: number): TableDraft {
  const name = d.table.fields[index]?.name
  if (name === undefined) return d
  const current = d.table.primaryKeyNames()
  const names = current.includes(name)
    ? current.filter((n) => n !== name)
    : d.table.fields.map((f) => f.name).filter((n) => n === name || current.includes(n))
  return edit(d, (t) => t.setPrimaryKeyColumns(names))
}

/** AUTOINCREMENT implies INTEGER PRIMARY KEY, so ticking it sets the column type. */
export function setAutoIncrement(d: TableDraft, index: number, on: boolean): TableDraft {
  const f = d.table.fields[index]
  if (!f) return d
  return edit(d, (t) => {
    if (on) {
      t.setPrimaryKeyColumns([f.name], true)
      t.fields[index]!.type = 'INTEGER'
    } else {
      const pk = t.primaryKey()
      if (pk) pk.autoIncrement = false
    }
  })
}

/** Text of the Foreign Key cell for a column. */
export function columnForeignKey(table: Table, column: string): string {
  return table.foreignKey([column])?.toString() ?? ''
}

export function previewSql(d: TableDraft): string {
  return d.table.fields.length ? d.table.sql(d.schema) : ''
}
