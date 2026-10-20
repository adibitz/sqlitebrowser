// The CSV reader behaves like Python's csv module as the import dialog used it.
import { describe, expect, it } from 'vitest'
import { CsvParser, parseCsv, type CsvParseOptions } from '@shared/csv/csvParser'

const opts: CsvParseOptions = { separator: ',', quote: '"', trim: false }

describe('parseCsv', () => {
  it('reads quoted fields with separators, doubled quotes and line breaks', () => {
    const text = 'a,"b,c","say ""hi""","two\r\nlines"\r\n1,2,3,4'
    expect(parseCsv(text, opts)).toEqual([
      ['a', 'b,c', 'say "hi"', 'two\r\nlines'],
      ['1', '2', '3', '4'],
    ])
  })

  it('skips empty lines and keeps empty fields', () => {
    expect(parseCsv('a,,c\n\n\r\n,\n', opts)).toEqual([
      ['a', '', 'c'],
      ['', ''],
    ])
  })

  it('is lenient about text after a closing quote (strict=False)', () => {
    expect(parseCsv('"ab"c,d\n', opts)).toEqual([['abc', 'd']])
  })

  it('treats quotes as text when quoting is off, and trims when asked', () => {
    expect(parseCsv('"a"; b ;c\n', { separator: ';', quote: '', trim: true })).toEqual([['"a"', 'b', 'c']])
  })

  it('gives the same rows however the text is split into chunks', () => {
    const text = 'id,"note"\r\n1,"multi\nline, with ""quotes"""\r\n2,last'
    const whole = parseCsv(text, opts)
    for (let size = 1; size <= 7; size++) {
      const parser = new CsvParser(opts)
      const rows: string[][] = []
      for (let i = 0; i < text.length; i += size) rows.push(...parser.push(text.slice(i, i + size)))
      rows.push(...parser.finish())
      expect(rows).toEqual(whole)
    }
  })
})
