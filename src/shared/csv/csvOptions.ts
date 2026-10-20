// Choices of the CSV import and data export dialogs (port of import_csv.py / export_data.py).
import type { CsvParseOptions } from './csvParser'
import type { FieldDetectionOptions } from './csvFields'

export const CSV_SEPARATORS = [
  { label: 'Comma  ,', value: ',' },
  { label: 'Semicolon  ;', value: ';' },
  { label: 'Tab', value: '\t' },
  { label: 'Pipe  |', value: '|' },
  { label: 'Space', value: ' ' },
] as const

export const CSV_QUOTES = [
  { label: 'Double quote  "', value: '"' },
  { label: "Single quote  '", value: "'" },
  { label: 'None', value: '' },
] as const

export const CSV_NEWLINES = [
  { label: 'Windows (CRLF)', value: '\r\n' },
  { label: 'Unix (LF)', value: '\n' },
] as const

/** Labels TextDecoder understands. */
export const CSV_ENCODINGS = [
  'UTF-8',
  'UTF-16',
  'ISO-8859-1',
  'Windows-1252',
  'Windows-1251',
  'Shift_JIS',
  'GB18030',
  'Big5',
] as const

export const CONFLICT_ACTIONS = [
  { label: 'Abort on conflict', value: '' },
  { label: 'Ignore conflicting rows', value: 'OR IGNORE' },
  { label: 'Replace conflicting rows', value: 'OR REPLACE' },
] as const

export type ConflictAction = (typeof CONFLICT_ACTIONS)[number]['value']

export interface CsvReadOptions extends CsvParseOptions, FieldDetectionOptions {
  encoding: string
}
