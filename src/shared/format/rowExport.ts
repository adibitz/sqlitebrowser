// Port of reference/sqliteview/core/rowexport.py: rows -> CSV / TSV / JSON / SQL INSERT / Markdown.
// Pure: used for copying selections in the UI and for exports in the worker.
import type { SqlValue } from '../types/values'
import { isBinary, valueToText } from './data'
import { sqlLiteral } from './sqlLiteral'

export const ROW_FORMATS = {
  csv: 'CSV',
  tsv: 'Tab separated',
  json: 'JSON',
  sql: 'SQL INSERT statements',
  md: 'Markdown table',
} as const

export type RowFormat = keyof typeof ROW_FORMATS

/** File extension written for each row format. */
export const ROW_FORMAT_EXTENSIONS: Record<RowFormat, string> = {
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  sql: 'sql',
  md: 'md',
}

export interface FormatOptions {
  /** Table name for SQL INSERT statements. */
  table?: string
  separator?: string
  quote?: string
  newline?: string
  header?: boolean
  prettyJson?: boolean
  /** How identifiers are quoted in SQL output (defaults to double quotes). */
  escapeIdentifier?: (name: string) => string
}

const doubleQuote = (name: string): string => '"' + name.replaceAll('"', '""') + '"'

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/** CSV quoting rules from upstream: base64 for binary, quote when special characters occur. */
export function csvField(v: SqlValue, sep: string, quote: string, newline: string): string {
  if (v === null) return ''
  if (v instanceof Uint8Array && isBinary(v)) return base64(v)
  const s = valueToText(v)
  if (!quote && s.includes(newline)) return '"' + s.replaceAll('"', '""') + '"'
  if (quote && [newline, sep, quote, '\n', '\r'].some((ch) => s.includes(ch))) {
    return quote + s.replaceAll(quote, quote + quote) + quote
  }
  return s
}

function jsonValue(v: SqlValue): unknown {
  if (v instanceof Uint8Array) return base64(v)
  // JSON has no 64-bit integers: keep exact values exact, as numbers when that is safe.
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString()
  return v
}

function markdownCell(v: SqlValue): string {
  if (v === null) return 'NULL'
  if (v instanceof Uint8Array && isBinary(v)) return `BLOB (${v.length} bytes)`
  return valueToText(v).replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ')
}

/** Renders rows (values in `names` order) in one of ROW_FORMATS. */
export function formatRows(
  format: RowFormat,
  names: readonly string[],
  rows: readonly (readonly SqlValue[])[],
  opts: FormatOptions = {},
): string {
  const {
    table = 'table',
    newline = '\r\n',
    header = true,
    prettyJson = true,
    escapeIdentifier = doubleQuote,
  } = opts
  let { separator = ',', quote = '"' } = opts

  if (format === 'json') {
    const data = rows.map((r) => Object.fromEntries(names.map((n, i) => [n, jsonValue(r[i] ?? null)])))
    return JSON.stringify(data, null, prettyJson ? 4 : undefined)
  }
  if (format === 'sql') {
    const cols = names.map(escapeIdentifier).join(',')
    const target = escapeIdentifier(table)
    return (
      rows.map((r) => `INSERT INTO ${target} (${cols}) VALUES (${r.map(sqlLiteral).join(',')});`).join('\n') +
      '\n'
    )
  }
  if (format === 'md') {
    const head = header
      ? [
          '| ' + names.map((n) => n.replaceAll('|', '\\|')).join(' | ') + ' |',
          '|' + names.map(() => ' --- ').join('|') + '|',
        ]
      : []
    const lines = [...head, ...rows.map((r) => '| ' + r.map(markdownCell).join(' | ') + ' |')]
    return lines.join('\n') + '\n'
  }
  if (format === 'tsv') {
    separator = '\t'
    quote = '"'
  }
  const out: string[] = []
  if (header) {
    out.push(
      names.map((n) => (quote ? quote + n.replaceAll(quote, quote + quote) + quote : n)).join(separator),
    )
  }
  for (const r of rows) out.push(r.map((v) => csvField(v, separator, quote, newline)).join(separator))
  return out.join(newline) + newline
}

/** Picks a row format from a file extension (CSV by default). */
export function formatForPath(path: string): RowFormat {
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : ''
  const map: Record<string, RowFormat> = {
    json: 'json',
    sql: 'sql',
    md: 'md',
    markdown: 'md',
    tsv: 'tsv',
    tab: 'tsv',
  }
  return map[ext] ?? 'csv'
}
