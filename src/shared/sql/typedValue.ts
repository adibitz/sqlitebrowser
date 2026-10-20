// Port of the typing rules of upstream SqliteTableModel::setTypedData. Pure: the worker types
// edited cells and inserted records with it; the renderer previews the same values.
import { Affinity, type Field } from '../sqlb/field'
import type { SqlValue } from '../types/values'

/**
 * BLOB stays BLOB; INTEGER/REAL when the column affinity is numeric and the text parses; '' in an
 * INTEGER primary key becomes 0; everything else is TEXT. `field` null means an unknown column.
 */
export function typedValue(
  field: Field | null,
  inPrimaryKey: boolean,
  value: string | null | Uint8Array,
): SqlValue {
  if (value === null) return null
  if (value instanceof Uint8Array) return value
  const affinity = field?.affinity() ?? Affinity.Blob
  const text = value.trim()
  if (value === '' && field && inPrimaryKey && field.isInteger()) return 0n
  if (affinity === Affinity.Integer && /^[+-]?\d+$/.test(text)) return BigInt(text)
  if ((affinity === Affinity.Float || affinity === Affinity.Integer) && text) {
    const n = Number(text)
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text) && Number.isFinite(n)) return n
  }
  return value
}
