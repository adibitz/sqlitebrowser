// Port of reference/sqliteview/core/db.py (get_row, add_record, delete_records, update_record).
// Records are addressed by _rowid_, or by the primary key of WITHOUT ROWID tables (composite keys
// through sqlb_make_single_value), or by a pseudo primary key chosen for a view.
import type { SqlValue } from '@shared/types/values'
import { escapeIdentifier, escapeIdentifiers, escapeString, ObjectIdentifier } from '@shared/sqlb/identifier'
import type { Table } from '@shared/sqlb/table'
import { executeSql, logSql, querySingleValue, runStatement } from './execute'
import { expandSql } from '@shared/sql/expandSql'
import { setSavepoint } from './savepoints'
import { getSchema, getTableByName } from './schemaLoad'
import { requireConn, type DbSession } from './session'

const DELETE_CHUNK = 500

function keyColumnsForEditing(
  session: DbSession,
  table: ObjectIdentifier,
  pseudoPk: readonly string[],
): string[] {
  if (pseudoPk.length) return [...pseudoPk]
  return getTableByName(session, table)?.rowidColumns() ?? []
}

function keyExpression(pks: readonly string[]): string {
  if (pks.length === 1) return escapeIdentifier(pks[0]!)
  return 'sqlb_make_single_value(' + escapeIdentifiers(pks).join(',') + ')'
}

function requireTable(session: DbSession, table: ObjectIdentifier): Table {
  const t = getTableByName(session, table)
  if (!t) throw new Error(`No table with name '${table.name}' exists in schema '${table.schema}'.`)
  return t
}

export function getRow(session: DbSession, table: ObjectIdentifier, rowid: SqlValue): SqlValue[] | null {
  const t = requireTable(session, table)
  const sql = `SELECT * FROM ${table.toString()} WHERE ${keyExpression(t.rowidColumns())}=?`
  return runStatement(session, sql, [rowid]).rows?.[0] ?? null
}

function toBigInt(v: SqlValue): bigint {
  if (typeof v === 'bigint') return v
  if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.trunc(v))
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return BigInt(v.trim())
  return 0n
}

/** Highest value in a column, or the AUTOINCREMENT sequence for a single-column primary key. */
function maxValue(session: DbSession, table: ObjectIdentifier, column: string): bigint {
  let query = `SELECT MAX(CAST(${escapeIdentifier(column)} AS INTEGER)) FROM ${table.toString()}`
  if (getSchema(session, table.schema)?.tables.has('sqlite_sequence')) {
    const pk = getTableByName(session, table)?.primaryKeyNames() ?? []
    if (pk.length === 1 && pk[0] === column) {
      query =
        `SELECT COALESCE(SUM(seq), (${query})) FROM ${escapeIdentifier(table.schema)}.sqlite_sequence ` +
        `WHERE name=${escapeString(table.name)}`
    }
  }
  return toBigInt(querySingleValue(session, query))
}

function emptyInsertStatement(session: DbSession, schema: string, t: Table, pkValue: string | null): string {
  const stmt = `INSERT INTO ${escapeIdentifier(schema)}.${escapeIdentifier(t.name)}`
  const pk = t.primaryKeyNames()
  const fields: string[] = []
  const vals: string[] = []
  for (const f of t.fields) {
    if (f.generated) continue
    if (pk.length === 1 && pk[0] === f.name) {
      fields.push(f.name)
      if (pkValue !== null) {
        vals.push(f.isText() ? escapeString(pkValue) : pkValue)
      } else if (f.notNull) {
        const next = String(maxValue(session, new ObjectIdentifier(schema, t.name), f.name) + 1n)
        vals.push(f.isText() ? escapeString(next) : next)
      } else {
        vals.push('NULL')
      }
    } else if (f.notNull && !f.defaultValue) {
      fields.push(f.name)
      vals.push(f.isInteger() ? '0' : "''")
    } else if (!f.defaultValue) {
      fields.push(f.name)
      vals.push('NULL')
    }
  }
  if (!fields.length) return stmt + ' DEFAULT VALUES;'
  return `${stmt}(${escapeIdentifiers(fields).join(',')}) VALUES (${vals.join(',')});`
}

/** Inserts an empty record and returns its rowid (or primary key value for WITHOUT ROWID tables). */
export function addRecord(session: DbSession, table: ObjectIdentifier): SqlValue {
  const t = requireTable(session, table)
  if (t.withoutRowid) {
    const rc = t.rowidColumns()
    const pkValue = String(maxValue(session, table, rc[rc.length - 1]!) + 1n)
    executeSql(session, emptyInsertStatement(session, table.schema, t, pkValue))
    return /^\d+$/.test(pkValue) ? BigInt(pkValue) : pkValue
  }
  executeSql(session, emptyInsertStatement(session, table.schema, t, null))
  return requireConn(session).prepare('SELECT last_insert_rowid()').pluck().get() as bigint
}

export function deleteRecords(
  session: DbSession,
  table: ObjectIdentifier,
  rowids: readonly SqlValue[],
  pseudoPk: readonly string[] = [],
): void {
  requireConn(session)
  const pks = keyColumnsForEditing(session, table, pseudoPk)
  if (!pks.length) throw new Error('Cannot delete this object')
  const target = keyExpression(pks)
  setSavepoint(session)
  for (let i = 0; i < rowids.length; i += DELETE_CHUNK) {
    const part = rowids.slice(i, i + DELETE_CHUNK)
    const sql = `DELETE FROM ${table.toString()} WHERE ${target} IN (${part.map(() => '?').join(',')});`
    logSql(session, expandSql(sql, part))
    runStatement(session, sql, part)
  }
}

/** Sets one cell. `value` is already typed (null/bigint/number/string/bytes). */
export function updateRecord(
  session: DbSession,
  table: ObjectIdentifier,
  column: string,
  rowid: SqlValue,
  value: SqlValue,
  pseudoPk: readonly string[] = [],
): void {
  requireConn(session)
  const pks = keyColumnsForEditing(session, table, pseudoPk)
  if (!pks.length) throw new Error('Cannot set data on this object')
  const sql = `UPDATE ${table.toString()} SET ${escapeIdentifier(column)}=? WHERE ${keyExpression(pks)}=?`
  setSavepoint(session)
  logSql(session, expandSql(sql, [value, rowid]))
  runStatement(session, sql, [value, rowid])
}
