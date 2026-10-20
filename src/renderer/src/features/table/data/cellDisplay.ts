// Port of the DisplayRole / alignment rules of reference/sqliteview/core/table_model.py (data()).
import { isBinary, valueToText } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'

export interface DisplayOptions {
  nullText: string
  blobText: string
  symbolLimit: number
}

export type CellKind = 'null' | 'blob' | 'number' | 'text'

export interface CellDisplay {
  text: string
  kind: CellKind
}

export function displayCell(value: SqlValue | undefined, opts: DisplayOptions): CellDisplay {
  if (value === undefined) return { text: '', kind: 'text' }
  if (value === null) return { text: opts.nullText, kind: 'null' }
  if (isBinary(value)) return { text: opts.blobText, kind: 'blob' }
  const text = valueToText(value)
  const kind: CellKind = typeof value === 'bigint' || typeof value === 'number' ? 'number' : 'text'
  // One line in the grid; the inspector shows the full value.
  const oneLine = text.length > opts.symbolLimit ? text.slice(0, opts.symbolLimit) + ' …' : text
  return { text: oneLine.replace(/\r?\n/g, ' ↵ '), kind }
}

/** Text put in the editor when editing starts (NULL edits as empty). */
export function editText(value: SqlValue | undefined): string {
  return value === null || value === undefined ? '' : valueToText(value)
}
