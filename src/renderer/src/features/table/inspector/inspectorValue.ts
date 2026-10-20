// Port of reference/sqliteview/ui/inspector.py (hex_dump, parse_hex, mode choice, _current_value).
import { humanReadableSize, imageFormat, isBinary, valueToText } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'

export type InspectorMode = 'text' | 'json' | 'hex' | 'image'

const HEX = /^[0-9a-f]+$/i

export function hexDump(data: Uint8Array, width = 16): string {
  const lines: string[] = []
  for (let off = 0; off < data.length; off += width) {
    const chunk = data.subarray(off, off + width)
    const hx = [...chunk].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
    const ascii = [...chunk].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')
    lines.push(`${off.toString(16).toUpperCase().padStart(8, '0')}  ${hx.padEnd(width * 3)} ${ascii}`)
  }
  return lines.join('\n')
}

/** Accepts a dump made by hexDump or plain hex digits; throws on anything else. */
export function parseHex(text: string): Uint8Array {
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    let parts = line.split(/\s+/).filter(Boolean)
    if (parts.length > 1 && parts[0]!.length === 8 && HEX.test(parts[0]!)) {
      parts = parts.slice(1)
      const hexes: string[] = []
      for (const p of parts) {
        if (p.length === 2 && HEX.test(p)) hexes.push(p)
        else break // the ASCII column
      }
      out.push(hexes.join(''))
    } else {
      out.push(parts.join(''))
    }
  }
  const digits = out.join('')
  if (digits.length % 2 || (digits && !HEX.test(digits)))
    throw new Error('Invalid hex data: use pairs of 0-9 and A-F.')
  return Uint8Array.from(digits.match(/../g) ?? [], (h) => parseInt(h, 16))
}

export function looksLikeJson(s: string): boolean {
  if (!/^\s*[{[]/.test(s)) return false
  try {
    JSON.parse(s)
    return true
  } catch {
    return false
  }
}

/** Upstream's "auto switch mode": image, hex for binary, JSON for JSON text, else text. */
export function autoMode(value: SqlValue): InspectorMode {
  if (value instanceof Uint8Array && imageFormat(value)) return 'image'
  if (value instanceof Uint8Array && isBinary(value)) return 'hex'
  if (typeof value === 'string' && looksLikeJson(value)) return 'json'
  return 'text'
}

export interface TypeInfo {
  type: 'NULL' | 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB'
  detail: string
}

export function typeInfo(value: SqlValue): TypeInfo {
  if (value === null) return { type: 'NULL', detail: '' }
  if (typeof value === 'bigint') return { type: 'INTEGER', detail: '' }
  if (typeof value === 'number') return { type: 'REAL', detail: '' }
  if (value instanceof Uint8Array) {
    const fmt = imageFormat(value)
    const size = humanReadableSize(value.length)
    return { type: 'BLOB', detail: fmt ? `${fmt} image · ${size}` : size }
  }
  return { type: 'TEXT', detail: `${value.length.toLocaleString()} characters` }
}

/** What the editor shows for `value` in `mode`. */
export function textForMode(value: SqlValue, mode: InspectorMode): string {
  if (value === null) return ''
  if (mode === 'hex')
    return hexDump(value instanceof Uint8Array ? value : new TextEncoder().encode(valueToText(value)))
  if (mode === 'json') {
    const s = valueToText(value)
    try {
      return JSON.stringify(JSON.parse(s), null, 2)
    } catch {
      return s
    }
  }
  return valueToText(value)
}

/**
 * The value to store from the editor text: bytes from hex, compact JSON when the original was on one
 * line, otherwise the text as typed (the worker applies the column's typing rules).
 */
export function valueFromEditor(text: string, mode: InspectorMode, original: SqlValue): string | Uint8Array {
  if (mode === 'hex') return parseHex(text)
  if (mode === 'image' && original instanceof Uint8Array) return original
  if (mode === 'json') {
    try {
      const parsed: unknown = JSON.parse(text)
      if (typeof original === 'string' && !original.includes('\n')) return JSON.stringify(parsed)
    } catch {
      // invalid JSON is stored as typed; the panel warns about it
    }
  }
  return text
}

export function jsonError(text: string): string | null {
  try {
    JSON.parse(text || 'null')
    return null
  } catch (err) {
    return `Invalid JSON: ${(err as Error).message}`
  }
}
