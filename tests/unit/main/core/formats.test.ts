// Display and conditional formats as the worker applies them (test_formats_plot.py, model parts).
import { describe, expect, it } from 'vitest'
import { executeSql } from '../../../../src/main/core/db/execute'
import { validateDisplayFormat } from '../../../../src/main/core/displayFormat'
import { countRows, readRows } from '../../../../src/main/core/rows'
import type { BrowseQuery } from '@shared/types/rows'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'

const parent = { schema: 'main', name: 'parent' }
const query = (patch: Partial<BrowseQuery> = {}): BrowseQuery => ({
  table: parent,
  filters: {},
  globalFilter: '',
  sort: [{ column: 'id', direction: 'asc' }],
  pseudoPk: [],
  filterEscape: '\\',
  displayFormats: {},
  condFormats: [],
  ...patch,
})

describe('display formats', () => {
  it('validates formats against the table', () => {
    const db = openCoreTestDb()
    expect(validateDisplayFormat(db, parent, 'name', 'upper("name")')).toBe('')
    expect(validateDisplayFormat(db, parent, 'name', '42')).toMatch(/function call/)
    expect(validateDisplayFormat(db, parent, 'name', 'upper("name"), lower("name")')).toMatch(/returned 2/)
    expect(validateDisplayFormat(db, parent, 'name', 'nosuchfn("name")')).toMatch(/database engine/)
  })

  it('shows the formatted value, and filters apply to it', () => {
    const db = openCoreTestDb()
    const formatted = query({ displayFormats: { name: 'upper("name")' } })
    expect(readRows(db, formatted, 0, 10).map((r) => r[2])).toEqual(['ALICE', 'BOB', 'CARL'])
    expect(countRows(db, { ...formatted, filters: { name: '=BOB' } })).toBe(1)
    expect(() => readRows(db, query({ displayFormats: { nope: 'upper("nope")' } }), 0, 1)).toThrow(
      /no column nope/,
    )
  })
})

describe('conditional formats', () => {
  it('adds the index of the first matching rule after the columns', () => {
    const db = openCoreTestDb()
    executeSql(db, "INSERT INTO parent(name) VALUES ('')")
    const rows = readRows(db, query({ condFormats: [{ column: 'id', filters: ['>2', '>1', ''] }] }), 0, 10)
    expect(rows.map((r) => r[3])).toEqual([2n, 1n, 0n, 0n])
  })

  it('compares like the filter row, and an empty rule skips NULL', () => {
    const db = openCoreTestDb()
    executeSql(db, "CREATE TABLE n(v); INSERT INTO n VALUES (NULL), (5), ('Banana');")
    const q = (filters: string[]): BrowseQuery =>
      query({ table: { schema: 'main', name: 'n' }, sort: [], condFormats: [{ column: 'v', filters }] })
    expect(readRows(db, q(['']), 0, 5).map((r) => r[2])).toEqual([null, 0n, 0n])
    expect(readRows(db, q(['an', '>1']), 0, 5).map((r) => r[2])).toEqual([null, 1n, 0n])
    expect(readRows(db, q(['/^B.n/']), 0, 5).map((r) => r[2])).toEqual([null, null, 0n])
  })

  it("ignores rules that can't match instead of failing the page", () => {
    const db = openCoreTestDb()
    const rows = readRows(db, query({ condFormats: [{ column: 'name', filters: ['/[/', '%', 'b'] }] }), 0, 5)
    expect(rows.map((r) => r[3])).toEqual([null, 2n, null])
  })
})
