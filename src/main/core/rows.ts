// Port of reference/sqliteview/core/table_model.py: building the browse query (setQuery, updateFilter,
// updateGlobalFilter, sort), reading pages, and the typing rules of setTypedData / ditto_record.
// The UI asks for pages by offset instead of the Python lazy cache, so each call is self-contained.
import { filterToSqlCondition, tokenizeGlobalFilter } from '@shared/format/filters'
import type { BrowseQuery } from '@shared/types/rows'
import type { SqlValue } from '@shared/types/values'
import { logSql, runStatement } from './db/execute'
import { expandSql } from '@shared/sql/expandSql'
import { addRecord, getRow, updateRecord } from './db/records'
import { setSavepoint, setUndoSavepoint } from './db/savepoints'
import { getTableByName } from './db/schemaLoad'
import type { DbSession } from './db/session'
import { OrderBy, Query, SortDirection } from './query'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { insertStatement } from '@shared/sql/insertStatement'
import { typedValue } from '@shared/sql/typedValue'
import type { Table } from '@shared/sqlb/table'

function tableOf(session: DbSession, ref: { schema: string; name: string }): Table {
  const t = getTableByName(session, new ObjectIdentifier(ref.schema, ref.name))
  if (!t) throw new Error(`No table with name '${ref.name}' exists in schema '${ref.schema}'.`)
  return t
}

function requireColumns(t: Table, names: Iterable<string>): void {
  for (const n of names) {
    if (!t.findField(n)) throw new Error(`The table ${t.name} has no column ${n}.`)
  }
}

/** Key columns used to address rows: the view's chosen key, else the table's rowid columns. */
export function keyColumns(t: Table, pseudoPk: readonly string[]): string[] {
  if (t.isView()) return pseudoPk.length ? [...pseudoPk] : ['_rowid_']
  return t.rowidColumns()
}

/** A /regex/ filter whose pattern doesn't compile would make REGEXP fail the whole query. */
function hasBadRegex(filter: string): boolean {
  if (filter.length < 3 || !filter.startsWith('/') || !filter.endsWith('/')) return false
  try {
    new RegExp(filter.slice(1, -1))
    return false
  } catch {
    return true
  }
}

/**
 * Port of getMatchingCondFormat, evaluated by SQLite: the index of the first rule whose filter the
 * value matches. An empty filter matches every value that isn't NULL or a BLOB; a filter without a
 * usable condition never matches.
 */
export function condFormatMatch(selector: string, filters: readonly string[], escape: string): string {
  const whens = filters.flatMap((raw, i) => {
    const filter = raw.trim()
    if (!filter) return [`WHEN 1 THEN ${i}`]
    const cond = hasBadRegex(filter) ? '' : filterToSqlCondition(filter, escape)
    return cond ? [`WHEN ${selector} ${cond} THEN ${i}`] : []
  })
  if (!whens.length) return 'NULL'
  return `CASE WHEN ${selector} IS NULL OR typeof(${selector}) = 'blob' THEN NULL ${whens.join(' ')} END`
}

/** The SELECT for a browse query; column 0 is the row key. */
export function buildBrowseQuery(session: DbSession, spec: BrowseQuery): Query {
  const t = tableOf(session, spec.table)
  requireColumns(t, Object.keys(spec.filters))
  requireColumns(
    t,
    spec.sort.map((s) => s.column),
  )
  if (spec.pseudoPk.length) requireColumns(t, spec.pseudoPk)
  requireColumns(t, Object.keys(spec.displayFormats))
  requireColumns(
    t,
    spec.condFormats.map((c) => c.column),
  )

  const q = new Query(new ObjectIdentifier(spec.table.schema, spec.table.name))
  q.isView = t.isView()
  q.rowidColumns = keyColumns(t, spec.pseudoPk)
  q.columnNames = [q.rowidColumns.join(','), ...t.fieldNames()]
  if (Object.keys(spec.displayFormats).length) {
    q.selectedColumns = t
      .fieldNames()
      .map((n) => ({ originalColumn: n, selector: spec.displayFormats[n] ?? n }))
  }
  q.extraColumns = spec.condFormats.map((c) =>
    condFormatMatch(q.selectorFor(c.column), c.filters, spec.filterEscape),
  )
  for (const [column, text] of Object.entries(spec.filters)) {
    const cond = filterToSqlCondition(text, spec.filterEscape)
    if (cond) q.where.set(column, cond)
  }
  q.globalWhere = tokenizeGlobalFilter(spec.globalFilter)
    .map((v) => filterToSqlCondition(v, spec.filterEscape))
    .filter((c) => c)
  q.orderBy = spec.sort.map(
    (s) => new OrderBy(s.column, s.direction === 'asc' ? SortDirection.Ascending : SortDirection.Descending),
  )
  return q
}

export function countRows(session: DbSession, spec: BrowseQuery): number {
  const sql = buildBrowseQuery(session, spec).buildCountQuery()
  return Number(runStatement(session, sql).rows?.[0]?.[0] ?? 0)
}

export function readRows(session: DbSession, spec: BrowseQuery, offset: number, limit: number): SqlValue[][] {
  const sql = `${buildBrowseQuery(session, spec).buildQuery(true)} LIMIT ? OFFSET ?`
  return runStatement(session, sql, [BigInt(limit), BigInt(offset)]).rows ?? []
}

/** Types text typed into `column` like a cell edit (see typedValue). */
export function convertForColumn(t: Table, column: string, value: string | null | Uint8Array): SqlValue {
  const field = t.findField(column)
  return typedValue(field, !!field && t.primaryKeyNames().includes(field.name), value)
}

export interface CellUpdate {
  table: { schema: string; name: string }
  column: string
  key: SqlValue
  value: string | null | Uint8Array
  pseudoPk: string[]
}

/** Writes one cell (with an undo point, like the model) and returns the value as stored. */
export function setCell(session: DbSession, u: CellUpdate): SqlValue {
  const t = tableOf(session, u.table)
  requireColumns(t, [u.column])
  if (t.isView() && !u.pseudoPk.length) throw new Error('Choose a key column before editing this view.')
  if (t.findField(u.column)?.generated)
    throw new Error(`${u.column} is a generated column and can't be edited.`)
  const stored = convertForColumn(t, u.column, u.value)
  setUndoSavepoint(session)
  updateRecord(
    session,
    new ObjectIdentifier(u.table.schema, u.table.name),
    u.column,
    u.key,
    stored,
    u.pseudoPk,
  )
  return stored
}

/** Port of ditto_record: a new record with every non-key, non-generated value of `key`'s row. */
export function duplicateRow(
  session: DbSession,
  ref: { schema: string; name: string },
  key: SqlValue,
): SqlValue {
  const t = tableOf(session, ref)
  const id = new ObjectIdentifier(ref.schema, ref.name)
  const source = getRow(session, id, key)
  if (!source) throw new Error('That record no longer exists.')
  setUndoSavepoint(session)
  const newKey = addRecord(session, id)
  const pk = new Set(t.primaryKeyNames())
  t.fields.forEach((f, i) => {
    if (f.generated || pk.has(f.name)) return
    updateRecord(session, id, f.name, newKey, source[i] ?? null)
  })
  return newKey
}

/**
 * Port of AddRecordDialog.accept: inserts the given columns (typed like cell edits) and lets the
 * others take their defaults. Returns the rowid, or null for WITHOUT ROWID tables.
 */
export function insertRecord(
  session: DbSession,
  ref: { schema: string; name: string },
  values: Record<string, string | null>,
): SqlValue {
  const t = tableOf(session, ref)
  const columns = Object.keys(values)
  requireColumns(t, columns)
  const generated = columns.find((c) => t.findField(c)?.generated)
  if (generated) throw new Error(`${generated} is a generated column and can't be set.`)
  const params = columns.map((c) => convertForColumn(t, c, values[c] ?? null))
  const sql = insertStatement(ref, columns)
  setUndoSavepoint(session)
  setSavepoint(session)
  logSql(session, expandSql(sql, params))
  const result = runStatement(session, sql, params)
  return t.withoutRowid ? null : result.lastInsertRowid
}
