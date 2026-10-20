// Port of reference/sqliteview/core/data.py (value helpers, upstream src/Data.cpp).
// Pure: used by the DB worker and by the renderer (grid, inspector).
import type { SqlValue } from '../types/values'

const BOMS: readonly Uint8Array[] = [
  Uint8Array.of(0xef, 0xbb, 0xbf),
  Uint8Array.of(0x00, 0x00, 0xfe, 0xff),
  Uint8Array.of(0xff, 0xfe, 0x00, 0x00),
  Uint8Array.of(0xfe, 0xff),
  Uint8Array.of(0xff, 0xfe),
]

const IMAGE_SIGNATURES: readonly [Uint8Array, string][] = [
  [Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'PNG'],
  [Uint8Array.of(0xff, 0xd8, 0xff), 'JPEG'],
  [ascii('GIF87a'), 'GIF'],
  [ascii('GIF89a'), 'GIF'],
  [ascii('BM'), 'BMP'],
  [Uint8Array.of(0x49, 0x49, 0x2a, 0x00), 'TIFF'],
  [Uint8Array.of(0x4d, 0x4d, 0x00, 0x2a), 'TIFF'],
  [Uint8Array.of(0x00, 0x00, 0x01, 0x00), 'ICO'],
]

// Unassigned code points, or control characters that aren't whitespace (Python's isprintable rule).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const NON_PRINTABLE = /[\p{Cn}]|[\x00-\x08\x0e-\x1b\x7f-\x84\x86-\x9f]/u

function ascii(s: string): Uint8Array {
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

function startsWith(data: Uint8Array, prefix: Uint8Array, offset = 0): boolean {
  if (data.length < offset + prefix.length) return false
  for (let i = 0; i < prefix.length; i++) if (data[offset + i] !== prefix[i]) return false
  return true
}

export function startsWithBom(data: Uint8Array): boolean {
  return BOMS.some((bom) => startsWith(data, bom))
}

export function removeBom(data: Uint8Array): Uint8Array {
  const bom = BOMS.find((b) => startsWith(data, b))
  return bom ? data.subarray(bom.length) : data
}

/** Text without a leading byte order mark (U+FEFF). */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** True when `data` decodes cleanly to printable text (upstream isTextOnly). */
export function isTextOnly(data: Uint8Array, quickTest = false): boolean {
  if (startsWithBom(data)) return true
  if (quickTest && data.length > 512) {
    const sample = data.subarray(0, 512)
    if (sample.includes(0)) return false
    // A multibyte character cut off at the end of the sample is fine.
    for (let cut = 0; cut <= 3; cut++) {
      if (decodesAsUtf8(sample.subarray(0, sample.length - cut))) return true
    }
    return false
  }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return false
  }
  return !NON_PRINTABLE.test(text)
}

function decodesAsUtf8(data: Uint8Array): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data)
    return true
  } catch {
    return false
  }
}

/** Binary means bytes that aren't printable text (upstream SqliteTableModel::isBinary). */
export function isBinary(value: SqlValue): boolean {
  return value instanceof Uint8Array && !isTextOnly(value, true)
}

/** Image format name when the value looks like an image, else ''. */
export function imageFormat(value: SqlValue): string {
  if (!(value instanceof Uint8Array)) return ''
  for (const [sig, fmt] of IMAGE_SIGNATURES) if (startsWith(value, sig)) return fmt
  if (startsWith(value, ascii('RIFF')) && startsWith(value, ascii('WEBP'), 8)) return 'WEBP'
  const head = new TextDecoder('latin1').decode(value.subarray(0, 256)).trimStart()
  if (head.startsWith('<svg')) return 'SVG'
  if (
    head.startsWith('<?xml') &&
    new TextDecoder('latin1').decode(value.subarray(0, 1024)).includes('<svg')
  ) {
    return 'SVG'
  }
  return ''
}

/** Text form of a value, as the original shows it. */
export function valueToText(value: SqlValue): string {
  if (value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') return formatReal(value)
  return new TextDecoder('utf-8').decode(removeBom(value))
}

/** SQLite prints REAL values with up to 15 significant digits ("%!.15g"); whole numbers keep ".0". */
export function formatReal(v: number): string {
  if (Number.isNaN(v)) return 'NaN'
  if (v === Infinity) return 'Inf'
  if (v === -Infinity) return '-Inf'
  const s = formatG(v, 15)
  return s.includes('e') || s.includes('.') ? s : s + '.0'
}

/** C printf "%.<precision>g". */
export function formatG(v: number, precision: number): string {
  if (v === 0) return Object.is(v, -0) ? '-0' : '0'
  const [mantissa, expPart] = v.toExponential(precision - 1).split('e')
  const exp = Number(expPart)
  if (exp < -4 || exp >= precision) {
    const m = stripZeros(mantissa!)
    const sign = exp < 0 ? '-' : '+'
    return `${m}e${sign}${String(Math.abs(exp)).padStart(2, '0')}`
  }
  return stripZeros(v.toFixed(Math.max(0, precision - 1 - exp)))
}

function stripZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

export function valueToBytes(value: SqlValue): Uint8Array {
  if (value === null) return new Uint8Array()
  if (value instanceof Uint8Array) return value
  return new TextEncoder().encode(valueToText(value))
}

export function humanReadableSize(byteCount: number): string {
  let size = byteCount
  for (const unit of ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB']) {
    if (size < 1024) return `${size.toFixed(2)} ${unit}`
    size /= 1024
  }
  return `${size.toFixed(2)} YiB`
}

/** Strips -- and /* *\/ comments outside quotes (upstream removeCommentsFromQuery). */
export function removeCommentsFromQuery(query: string): string {
  let out = ''
  let i = 0
  let quote = ''
  let changed = false
  const n = query.length
  while (i < n) {
    const c = query[i]!
    if (!quote) {
      if (`'"[`.includes(c) && (i === 0 || query[i - 1] !== '\\')) {
        quote = c === '[' ? ']' : c
        out += c
      } else if (c === '-' && query.startsWith('--', i)) {
        const j = query.indexOf('\n', i)
        changed = true
        if (j === -1) break
        i = j
        continue
      } else if (c === '/' && query.startsWith('/*', i)) {
        const j = query.indexOf('*/', i)
        changed = true
        if (j === -1) break
        i = j + 2
        continue
      } else {
        out += c
      }
    } else {
      if (c === quote && (i === 0 || query[i - 1] !== '\\')) quote = ''
      out += c
    }
    i++
  }
  let result = out.trim()
  if (changed) result = result.replace(/\n+/g, '\n').replace(/[ \t]+\n/g, '\n')
  return result
}

/** Parses tab-separated clipboard text with quoted fields (upstream parseClipboard). */
export function parseClipboard(input: string): string[][] {
  let text = input
  if (text.endsWith('\n')) text = text.slice(0, -1)
  if (text.endsWith('\r')) text = text.slice(0, -1)
  if (!text) return []
  const rows: string[][] = [[]]
  let i = 0
  const n = text.length
  for (;;) {
    let field: string | null = null
    if (i < n && text[i] === '"') {
      let j = i + 1
      let buf = ''
      let closed = false
      while (j < n) {
        if (text[j] === '"') {
          if (j + 1 < n && text[j + 1] === '"') {
            buf += '"'
            j += 2
            continue
          }
          closed = true
          break
        }
        buf += text[j]
        j++
      }
      if (closed && (j + 1 === n || '\t\r\n'.includes(text[j + 1]!))) {
        field = buf
        i = j + 1
      }
    }
    if (field === null) {
      const rest = text.slice(i)
      const m = /\t|\r?\n/.exec(rest)
      const k = m ? i + m.index : n
      field = text.slice(i, k)
      i = k
    }
    // LibreOffice turns tabs inside text into SOH (0x01); turn them back.
    rows[rows.length - 1]!.push(field.replaceAll('\x01', '\t'))
    if (i >= n) break
    if (text[i] === '\t') {
      i++
    } else {
      i += text[i] === '\r' ? 2 : 1
      rows.push([])
    }
    if (i >= n) {
      rows[rows.length - 1]!.push('')
      break
    }
  }
  return rows
}
