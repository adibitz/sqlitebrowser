// Port of the field list rules of ImportCsvDialog._field_list (upstream generateFieldList).
import { describe, expect, it } from 'vitest'
import { detectFields, tableNameForFile } from '@shared/csv/csvFields'
import { isIntText, isRealText } from '@shared/format/numberText'

const defaults = { header: true, sanitizeNames: false, noTypeDetection: false }

describe('detectFields', () => {
  it('names columns from the header and guesses types from the data', () => {
    const rows = [
      ['id', 'price', 'name', 'note'],
      ['1', '2', 'x', ''],
      ['2', '2.5', '3', ''],
      ['', '1e3', 'y', ''],
    ]
    expect(detectFields(rows, defaults)).toEqual([
      { name: 'id', type: 'INTEGER' },
      { name: 'price', type: 'REAL' },
      { name: 'name', type: 'TEXT' },
      { name: 'note', type: 'TEXT' },
    ])
  })

  it('makes names unique, fills blanks, and adds columns found in later rows', () => {
    const rows = [
      ['a', 'A', ''],
      ['1', '2', '3', '4'],
    ]
    expect(detectFields(rows, defaults).map((f) => f.name)).toEqual(['a', 'A_2', 'field3', 'field4'])
    expect(detectFields(rows, { ...defaults, header: false }).map((f) => f.name)).toEqual([
      'field1',
      'field2',
      'field3',
      'field4',
    ])
  })

  it('can clean up header names and skip type detection', () => {
    const rows = [
      ['first name', 'e-mail'],
      ['1', '2'],
    ]
    expect(detectFields(rows, { ...defaults, sanitizeNames: true, noTypeDetection: true })).toEqual([
      { name: 'first_name', type: '' },
      { name: 'e_mail', type: '' },
    ])
  })

  it('accepts numbers the way Python int() and float() do', () => {
    expect(['42', ' -7 ', '+3', '1_000'].every(isIntText)).toBe(true)
    expect(['1.5', '.5', '5.', '-2e-3', 'inf', 'NaN', '1'].every(isRealText)).toBe(true)
    expect(['1.2.3', '0x10', '', 'abc', '1e'].some((s) => isIntText(s) || isRealText(s))).toBe(false)
  })

  it('suggests a table name from the file name', () => {
    expect(tableNameForFile('C:\\data\\sales 2024.csv')).toBe('sales 2024')
    expect(tableNameForFile('/tmp/.hidden')).toBe('.hidden')
  })
})
