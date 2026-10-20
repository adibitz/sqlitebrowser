// Port of AddRecordDialog._statement: the INSERT for a record with some columns set.
import { escapeIdentifiers, ObjectIdentifier } from '../sqlb/identifier'
import type { ObjectRef } from '../types/schema'

/** INSERT with one '?' per column, or DEFAULT VALUES when no column is set. */
export function insertStatement(table: ObjectRef, columns: readonly string[]): string {
  const target = new ObjectIdentifier(table.schema, table.name).toString()
  if (!columns.length) return `INSERT INTO ${target} DEFAULT VALUES;`
  return `INSERT INTO ${target} (${escapeIdentifiers(columns).join(', ')}) VALUES (${columns.map(() => '?').join(', ')});`
}
