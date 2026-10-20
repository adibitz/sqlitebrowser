// Port of reference/sqliteview/ui/dialogs/edit_index.py (EditIndexDialog._index / _validate).
import { Index } from '@shared/sqlb/indexDef'
import { IndexedColumn } from '@shared/sqlb/indexedColumn'
import { findTable, type ObjectRef, type SchemaInfo } from '@shared/types/schema'

export type IndexOrder = '' | 'ASC' | 'DESC'

export interface IndexColumnChoice {
  name: string
  checked: boolean
  order: IndexOrder
}

export interface IndexDraft {
  name: string
  table: ObjectRef | null
  unique: boolean
  where: string
  /** Every column of the table, in table order; the checked ones are indexed. */
  columns: IndexColumnChoice[]
}

/** Tables an index can go on: not views, virtual or internal tables. */
export function indexableTables(schemata: SchemaInfo[]): ObjectRef[] {
  return schemata.flatMap((s) =>
    s.tables
      .filter((t) => t.kind === 'table')
      .map((t) => ({ schema: s.name, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  )
}

/** A fresh draft for `table` (its columns unchecked). */
export function indexDraftFor(
  schemata: SchemaInfo[],
  table: ObjectRef | null,
  base?: IndexDraft,
): IndexDraft {
  const info = table ? findTable(schemata, table) : null
  return {
    name: base?.name ?? '',
    unique: base?.unique ?? false,
    where: base?.where ?? '',
    table: info ? table : null,
    columns: (info?.columns ?? []).map((c) => ({ name: c.name, checked: false, order: '' })),
  }
}

export function buildIndex(d: IndexDraft): Index {
  const idx = new Index(d.name.trim())
  idx.table = d.table?.name ?? ''
  idx.unique = d.unique
  idx.whereExpr = d.where.trim()
  idx.fields = d.columns.filter((c) => c.checked).map((c) => new IndexedColumn(c.name, false, c.order))
  return idx
}

export function indexSql(d: IndexDraft): string {
  const idx = buildIndex(d)
  return idx.fields.length ? idx.sql(d.table?.schema ?? 'main') : ''
}

export function validateIndex(d: IndexDraft, schemata: SchemaInfo[]): string {
  const name = d.name.trim()
  if (!name) return 'Please enter a name for the index.'
  if (!d.table) return 'Please select a table.'
  const schema = schemata.find((s) => s.name === d.table!.schema)
  if (schema?.indices.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
    return `An index named '${name}' already exists.`
  }
  if (!d.columns.some((c) => c.checked)) return 'Please select at least one column.'
  return ''
}
