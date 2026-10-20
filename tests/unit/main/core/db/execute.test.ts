// Port of reference/tests/test_core.py::test_execute_multi_sql_rollback and ::test_dump_roundtrip.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { dumpDatabase } from '../../../../../src/main/core/db/dump'
import { executeMultiSql, executeSql, querySingleValue } from '../../../../../src/main/core/db/execute'
import type { LogMessageType } from '../../../../../src/main/core/db/session'
import { openCoreTestDb } from '../../../../fixtures/coreTestDb'
import { tempDir } from '../../../../fixtures/tempDir'

describe('executeMultiSql', () => {
  it('rolls the whole script back when a statement fails', () => {
    const db = openCoreTestDb()
    expect(() =>
      executeMultiSql(db, "INSERT INTO parent(name) VALUES('z'); INSERT INTO nope VALUES(1);"),
    ).toThrow(/statement #2/)
    expect(querySingleValue(db, "SELECT COUNT(*) FROM parent WHERE name='z'")).toBe(0n)
  })

  it('reloads the schema after DDL and reports progress', () => {
    const db = openCoreTestDb()
    const seen: number[] = []
    executeMultiSql(db, 'CREATE TABLE a(x); INSERT INTO a VALUES (1);', {
      progress: (p) => {
        seen.push(p)
        return true
      },
    })
    expect(db.schemata.get('main')!.tables.has('a')).toBe(true)
    expect(seen.at(-1)).toBe(100)
  })

  it('can be cancelled', () => {
    const db = openCoreTestDb()
    expect(() => executeMultiSql(db, 'CREATE TABLE a(x);', { progress: () => false })).toThrow(
      'Action cancelled.',
    )
    expect(db.schemata.get('main')!.tables.has('a')).toBe(false)
  })
})

describe('executeSql', () => {
  it('logs statements and names the failing one', () => {
    const logged: [string, LogMessageType][] = []
    const db = openCoreTestDb()
    db.events.log = (sql, type) => logged.push([sql, type])
    executeSql(db, 'SELECT 1')
    expect(logged.some(([sql]) => sql === 'SELECT 1')).toBe(true)
    expect(() => executeSql(db, 'SELEC 1')).toThrow(/syntax error.*\(SELEC 1\)/)
  })
})

describe('dumpDatabase', () => {
  it('writes a script that recreates schema and data', () => {
    const db = openCoreTestDb()
    const out = join(tempDir(), 'dump.sql')
    const tables = [...db.schemata.get('main')!.tables.keys()].filter((n) => !n.startsWith('sqlite_'))
    dumpDatabase(db, out, {
      tables,
      insertColumnNames: true,
      insertMultipleRows: false,
      keepOriginal: false,
      exportSchema: true,
      exportData: true,
      keepOldSchema: false,
    })
    const con = new Database(':memory:')
    con.exec(readFileSync(out, 'utf8'))
    expect(con.prepare('SELECT COUNT(*) FROM parent').pluck().get()).toBe(3)
    expect(con.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").pluck().get()).toBe('trg')
    con.close()
  })

  it('removes the partial file when cancelled', () => {
    const db = openCoreTestDb()
    executeMultiSql(
      db,
      'CREATE TABLE many(n); WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<2500) INSERT INTO many SELECT x FROM c;',
    )
    const out = join(tempDir(), 'dump.sql')
    expect(() =>
      dumpDatabase(db, out, {
        tables: ['many'],
        insertColumnNames: false,
        insertMultipleRows: true,
        keepOriginal: false,
        exportSchema: true,
        exportData: true,
        keepOldSchema: false,
        progress: () => false,
      }),
    ).toThrow('Export cancelled.')
    expect(() => readFileSync(out)).toThrow()
  })
})
