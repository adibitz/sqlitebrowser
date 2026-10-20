// Port of EditTableDialog._validate.
import { findTable, type ObjectRef, type SchemaInfo } from '@shared/types/schema'
import type { TableDraft } from './tableDraft'

/** The first problem that blocks saving, or '' when the draft can be saved. */
export function validateTable(d: TableDraft, original: ObjectRef | null, schemata: SchemaInfo[]): string {
  const t = d.table
  if (!t.name) return 'Please enter a name for the table.'
  if (!t.fields.length) return 'Please add at least one column.'
  const seen = new Set<string>()
  for (const f of t.fields) {
    if (!f.name) return "Column names can't be empty."
    if (seen.has(f.name.toLowerCase())) return `Duplicate column name '${f.name}'.`
    seen.add(f.name.toLowerCase())
  }
  if (t.withoutRowid && !t.primaryKeyNames().length) return 'WITHOUT ROWID tables need a primary key.'
  if (t.withoutRowid && t.primaryKey()?.autoIncrement) {
    return "AUTOINCREMENT isn't allowed in WITHOUT ROWID tables."
  }
  const existing = schemata
    .find((s) => s.name === d.schema)
    ?.tables.find((x) => x.name.toLowerCase() === t.name.toLowerCase())
  const isSelf =
    original !== null &&
    original.schema === d.schema &&
    original.name.toLowerCase() === t.name.toLowerCase() &&
    findTable(schemata, original) !== null
  if (existing && !isSelf) return `A table named '${t.name}' already exists.`
  return ''
}
