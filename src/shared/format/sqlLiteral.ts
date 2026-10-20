// Port of reference/sqliteview/core/db.py (sql_literal). Pure: used by the worker and the renderer.
import type { SqlValue } from '../types/values'

function hex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out.toUpperCase()
}

function quoteString(s: string): string {
  return "'" + s.replaceAll("'", "''") + "'"
}

/** SQL literal used in dumps and the log. Byte-exact: BLOBs become X'..'. */
export function sqlLiteral(v: SqlValue | boolean | undefined): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'NULL'
    if (!Number.isFinite(v)) return v > 0 ? '1e999' : '-1e999'
    // Keep REAL values REAL when read back (1 -> 1.0).
    return Number.isInteger(v) && Math.abs(v) < 1e16 ? v.toFixed(1) : String(v)
  }
  if (v instanceof Uint8Array) return `X'${hex(v)}'`
  if (v.includes('\x00')) return `CAST(X'${hex(new TextEncoder().encode(v))}' AS TEXT)`
  return quoteString(v)
}
