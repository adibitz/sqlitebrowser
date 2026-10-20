// Port of reference/tests/test_browse_features.py::test_format_rows.
import { describe, expect, it } from 'vitest'
import { formatForPath, formatRows } from '@shared/format/rowExport'

const names = ['id', 'name']
const rows = [
  [1n, 'a,"b"'],
  [2n, null],
]

describe('formatRows', () => {
  it('writes CSV with upstream quoting', () => {
    expect(formatRows('csv', names, rows, { newline: '\n' })).toBe('"id","name"\n1,"a,""b"""\n2,\n')
  })

  it('writes TSV', () => {
    expect(formatRows('tsv', names, [[1n, 'a,b']], { newline: '\n' }).split('\n')[1]).toBe('1\ta,b')
  })

  it('writes JSON with numbers for integers that fit', () => {
    expect(JSON.parse(formatRows('json', names, rows))).toEqual([
      { id: 1, name: 'a,"b"' },
      { id: 2, name: null },
    ])
    expect(JSON.parse(formatRows('json', ['n'], [[9223372036854775807n]]))).toEqual([
      { n: '9223372036854775807' },
    ])
  })

  it('writes SQL INSERT statements', () => {
    expect(
      formatRows('sql', names, rows, { table: 't' }).startsWith(
        `INSERT INTO "t" ("id","name") VALUES (1,'a,"b"');`,
      ),
    ).toBe(true)
  })

  it('writes a Markdown table and base64 for binary in CSV', () => {
    expect(formatRows('md', names, rows)).toContain('| 2 | NULL |')
    expect(formatRows('csv', ['b'], [[Uint8Array.of(0, 255)]], { header: false, newline: '\n' })).toBe(
      'AP8=\n',
    )
  })

  it('picks the format from a file extension', () => {
    expect(formatForPath('x.JSON')).toBe('json')
    expect(formatForPath('x.txt')).toBe('csv')
    expect(formatForPath('notes.markdown')).toBe('md')
  })
})
