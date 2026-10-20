// Port of validate_display_format (upstream ColumnDisplayFormatDialog::accept).
import { displayFormatShapeError } from '@shared/format/displayFormat'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import type { ObjectRef } from '@shared/types/schema'
import { requireConn, type DbSession } from './db/session'

/** An error message, or '' when `selector` can be shown instead of `column`. */
export function validateDisplayFormat(
  session: DbSession,
  table: ObjectRef,
  column: string,
  selector: string,
): string {
  const shape = displayFormatShapeError(selector, column)
  if (shape) return shape
  let count: number
  try {
    const target = new ObjectIdentifier(table.schema, table.name).toString()
    count = requireConn(session).prepare(`SELECT ${selector} FROM ${target} LIMIT 1`).columns().length
  } catch (err) {
    return `Error in custom display format. Message from database engine:\n\n${(err as Error).message}`
  }
  return count === 1 ? '' : `Custom display format must return only one column but it returned ${count}.`
}
