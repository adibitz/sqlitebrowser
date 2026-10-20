// Browse queries and editing rules (port of the model parts of reference/tests/test_core.py and
// test_browse_features.py that don't need a UI).
import { describe, expect, it } from 'vitest'
import type { BrowseQuery } from '@shared/types/rows'
import { executeSql, querySingleValue } from '../../../../src/main/core/db/execute'
import { getTableByName } from '../../../../src/main/core/db/schemaLoad'
import {
  buildBrowseQuery,
  convertForColumn,
  countRows,
  duplicateRow,
  readRows,
  setCell,
} from '../../../../src/main/core/rows'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'

const query = (name: string, patch: Partial<BrowseQuery> = {}): BrowseQuery => ({
  table: { schema: 'main', name },
  filters: {},
  globalFilter: '',
  sort: [],
  pseudoPk: [],
  filterEscape: '\\',
  displayFormats: {},
  condFormats: [],
  ...patch,
})

describe('browse query', () => {
  it('selects the row key first, then filters and sorts', () => {
    const db = openCoreTestDb()
    const sql = buildBrowseQuery(
      db,
      query('parent', { filters: { name: 'b' }, sort: [{ column: 'id', direction: 'desc' }] }),
    ).buildQuery(true)
    expect(sql).toBe(
      `SELECT "_rowid_",* FROM "main"."parent" WHERE "name" LIKE '%b%' ESCAPE '\\' ORDER BY "id" DESC`,
    )
  })

  it('counts and pages through filtered rows', () => {
    const db = openCoreTestDb()
    executeSql(
      db,
      "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 47) INSERT INTO parent(name) SELECT 'n' || x FROM c",
    )
    expect(countRows(db, query('parent'))).toBe(50)
    expect(countRows(db, query('parent', { filters: { id: '>40' } }))).toBe(10)
    const page = readRows(db, query('parent', { sort: [{ column: 'id', direction: 'asc' }] }), 10, 5)
    expect(page.map((r) => r[1])).toEqual([11n, 12n, 13n, 14n, 15n])
    expect(page[0]![0]).toBe(11n) // row key
  })

  it('searches every column with the global filter', () => {
    const db = openCoreTestDb()
    expect(countRows(db, query('parent', { globalFilter: 'ali' }))).toBe(1)
    expect(countRows(db, query('parent', { globalFilter: 'a /^c/' }))).toBe(1)
  })

  it('addresses WITHOUT ROWID rows by a combined key and views by NULL', () => {
    const db = openCoreTestDb()
    executeSql(db, "INSERT INTO wr VALUES ('k', 1, NULL)")
    expect(readRows(db, query('wr'), 0, 10)[0]![0]).toBe('1:k1:1')
    expect(readRows(db, query('v_parent'), 0, 1)[0]![0]).toBeNull()
  })

  it('rejects unknown columns instead of building SQL with them', () => {
    const db = openCoreTestDb()
    expect(() => buildBrowseQuery(db, query('parent', { filters: { 'x" OR 1=1 --': 'a' } }))).toThrow(
      /has no column/,
    )
    expect(() =>
      buildBrowseQuery(db, query('parent', { sort: [{ column: 'nope', direction: 'asc' }] })),
    ).toThrow(/has no column/)
    expect(() => buildBrowseQuery(db, query('missing'))).toThrow(/No table/)
  })
})

describe('editing cells', () => {
  it('stores typed values by column affinity', () => {
    const db = openCoreTestDb()
    executeSql(db, 'CREATE TABLE t(i INTEGER PRIMARY KEY, n INTEGER, r REAL, s TEXT, b BLOB)')
    const t = getTableByName(db, new ObjectIdentifier('main', 't'))!
    expect(convertForColumn(t, 'n', ' 42 ')).toBe(42n)
    expect(convertForColumn(t, 'n', '4.5')).toBe(4.5)
    expect(convertForColumn(t, 'n', '12abc')).toBe('12abc')
    expect(convertForColumn(t, 'r', '1e3')).toBe(1000)
    expect(convertForColumn(t, 's', '007')).toBe('007')
    expect(convertForColumn(t, 'i', '')).toBe(0n)
    expect(convertForColumn(t, 'b', null)).toBeNull()
    expect(convertForColumn(t, 'b', Uint8Array.of(1))).toEqual(Uint8Array.of(1))
  })

  it('writes a cell and returns the stored value', () => {
    const db = openCoreTestDb()
    const stored = setCell(db, {
      table: { schema: 'main', name: 'parent' },
      column: 'name',
      key: 1n,
      value: 'zed',
      pseudoPk: [],
    })
    expect(stored).toBe('zed')
    expect(querySingleValue(db, 'SELECT name FROM parent WHERE id = 1')).toBe('zed')
  })

  it('refuses generated columns and views without a key', () => {
    const db = openCoreTestDb()
    expect(() =>
      setCell(db, {
        table: { schema: 'main', name: 'child' },
        column: 'total',
        key: 1n,
        value: '1',
        pseudoPk: [],
      }),
    ).toThrow(/generated column/)
    expect(() =>
      setCell(db, {
        table: { schema: 'main', name: 'v_parent' },
        column: 'name',
        key: 1n,
        value: 'x',
        pseudoPk: [],
      }),
    ).toThrow(/Choose a key column/)
  })

  it('duplicates a record except its primary key', () => {
    const db = openCoreTestDb()
    const key = duplicateRow(db, { schema: 'main', name: 'parent' }, 2n)
    expect(key).toBe(4n)
    expect(querySingleValue(db, 'SELECT name FROM parent WHERE id = 4')).toBe('bob')
  })
})
