// Port of ImportCsvDialog._field_list (upstream generateFieldList): column names from the header,
// types guessed from the first rows.
import { isIntText, isRealText } from '../format/numberText'

export const TYPE_DETECTION_ROWS = 20

export interface CsvField {
  name: string
  /** INTEGER, REAL, TEXT, or '' when type detection is off. */
  type: string
}

export interface FieldDetectionOptions {
  header: boolean
  /** Replace characters other than letters, digits and _ in header names. */
  sanitizeNames: boolean
  noTypeDetection: boolean
}

function nextType(old: string, content: string): string {
  if (old === 'TEXT' || content === '') return old
  const asInt = isIntText(content)
  const asReal = isRealText(content)
  if (old === 'INTEGER' && !asInt && asReal) return 'REAL'
  if (!old && asInt) return 'INTEGER'
  if (!old && asReal) return 'REAL'
  if (old === 'REAL' && asReal) return 'REAL'
  if (old === 'INTEGER' && asInt) return 'INTEGER'
  return 'TEXT'
}

function uniqueName(fields: CsvField[], wanted: string): string {
  let name = wanted
  for (let n = 2; fields.some((f) => f.name.toLowerCase() === name.toLowerCase()); n++)
    name = `${wanted}_${n}`
  return name
}

/** Fields for the first rows of a file (the header row included when `header` is on). */
export function detectFields(rows: readonly (readonly string[])[], opts: FieldDetectionOptions): CsvField[] {
  const fields: CsvField[] = []
  rows.slice(0, TYPE_DETECTION_ROWS + 1).forEach((row, rowNum) => {
    const isHeader = rowNum === 0 && opts.header
    for (let i = fields.length; i < row.length; i++) {
      let name = isHeader ? (row[i] ?? '') : ''
      if (isHeader && opts.sanitizeNames) name = name.replace(/[^\p{L}\p{N}_]/gu, '_')
      fields.push({ name: uniqueName(fields, name || `field${i + 1}`), type: '' })
    }
    if (opts.noTypeDetection || isHeader) return
    row.forEach((content, i) => {
      const f = fields[i]
      if (f) f.type = nextType(f.type, content)
    })
  })
  if (!opts.noTypeDetection) for (const f of fields) f.type ||= 'TEXT'
  return fields
}

/** The table name suggested for a file: its name without the extension. */
export function tableNameForFile(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? path
  const dot = file.lastIndexOf('.')
  return dot > 0 ? file.slice(0, dot) : file
}
