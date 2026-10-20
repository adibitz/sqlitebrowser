// Port of reference/tests/test_core.py: savepoints, commit, WITHOUT ROWID editing, SQL functions.
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { executeSql, querySingleValue } from '../../../../../src/main/core/db/execute'
import { addRecord, deleteRecords, getRow, updateRecord } from '../../../../../src/main/core/db/records'
import { releaseAllSavepoints, revertAll } from '../../../../../src/main/core/db/savepoints'
import { isDirty } from '../../../../../src/main/core/db/session'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { openCoreTestDb } from '../../../../fixtures/coreTestDb'

const parent = new ObjectIdentifier('main', 'parent')

describe('editing records', () => {
  it('keeps every change in a savepoint until reverted', () => {
    const db = openCoreTestDb()
    const rowid = addRecord(db, parent)
    expect(rowid).toBe(4n)
    expect(isDirty(db)).toBe(true)
    updateRecord(db, parent, 'name', rowid, 'carol')
    expect(getRow(db, parent, rowid)?.[1]).toBe('carol')
    revertAll(db)
    expect(isDirty(db)).toBe(false)
    expect(getRow(db, parent, rowid)).toBeNull()
  })

  it('writes changes to the file on commit', () => {
    const db = openCoreTestDb()
    deleteRecords(db, parent, [1n, 2n])
    releaseAllSavepoints(db)
    expect(isDirty(db)).toBe(false)
    const con = new Database(db.curFile, { readonly: true })
    expect(con.prepare('SELECT COUNT(*) FROM parent').pluck().get()).toBe(1)
    con.close()
  })

  it('addresses WITHOUT ROWID rows by their composite key', () => {
    const db = openCoreTestDb()
    const wr = new ObjectIdentifier('main', 'wr')
    executeSql(db, "INSERT INTO wr VALUES ('k', 1, X'00FF')")
    const key = querySingleValue(db, 'SELECT sqlb_make_single_value(a, b) FROM wr')
    expect(key).toBe('1:k1:1')
    updateRecord(db, wr, 'c', key, Uint8Array.of(1), ['a', 'b'])
    expect(querySingleValue(db, 'SELECT c FROM wr')).toEqual(Buffer.from([1]))
    deleteRecords(db, wr, [key])
    expect(querySingleValue(db, 'SELECT COUNT(*) FROM wr')).toBe(0n)
  })

  it('adds a WITHOUT ROWID record with the next key', () => {
    const db = openCoreTestDb()
    executeSql(db, 'CREATE TABLE p(sku INTEGER PRIMARY KEY, x) WITHOUT ROWID')
    executeSql(db, 'INSERT INTO p VALUES (7, NULL)')
    expect(addRecord(db, new ObjectIdentifier('main', 'p'))).toBe(8n)
    expect(querySingleValue(db, 'SELECT MAX(sku) FROM p')).toBe(8n)
  })

  it('reports a clear error for a missing table', () => {
    const db = openCoreTestDb()
    expect(() => addRecord(db, new ObjectIdentifier('main', 'nope'))).toThrow(/No table with name 'nope'/)
  })

  it('keeps 64-bit integers exact', () => {
    const db = openCoreTestDb()
    executeSql(db, 'CREATE TABLE big(n INTEGER)')
    executeSql(db, 'INSERT INTO big VALUES (9223372036854775807)')
    expect(querySingleValue(db, 'SELECT n FROM big')).toBe(9223372036854775807n)
  })
})

describe('SQL functions', () => {
  it('provides REGEXP', () => {
    const db = openCoreTestDb()
    expect(querySingleValue(db, "SELECT 'abc' REGEXP '^a'")).toBe(1n)
    expect(querySingleValue(db, "SELECT 'abc' REGEXP 'z'")).toBe(0n)
    expect(() => querySingleValue(db, "SELECT 'abc' REGEXP '('")).toThrow(/invalid operand/)
  })

  it('leaves REGEXP out when disabled', () => {
    const db = openCoreTestDb({ disableRegex: true })
    expect(() => querySingleValue(db, "SELECT 'abc' REGEXP '^a'")).toThrow(/no such function: REGEXP/)
  })

  it('explains a collation it cannot provide', () => {
    const db = openCoreTestDb()
    expect(() => querySingleValue(db, "SELECT 'B' < 'a' COLLATE UTF16CI")).toThrow(/collation UTF16CI/)
  })
})
