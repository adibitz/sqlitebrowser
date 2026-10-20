// Port of reference/tests/test_core.py::test_runsql, plus the savepoint and commit rules of RunSql.
import { describe, expect, it } from 'vitest'
import { querySingleValue } from '../../../../src/main/core/db/execute'
import { isDirty } from '../../../../src/main/core/db/session'
import { isPageable, queryCount, queryPage } from '../../../../src/main/core/queryRows'
import { runSqlScript } from '../../../../src/main/core/runSql'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'

const run = (db: ReturnType<typeof openCoreTestDb>, text: string, commitConfirmed = false) =>
  runSqlScript(db, text, 0, text.length, { commitConfirmed })

describe('runSqlScript', () => {
  it('executes, defers row queries, and stops at the first error', () => {
    const db = openCoreTestDb()
    const sql = 'CREATE TABLE r(a);\nINSERT INTO r VALUES (1),(2);\nSELECT * FROM r;\nbroken sql;'
    const { outcomes, modified } = run(db, sql)
    expect(outcomes.map((o) => o.kind)).toEqual(['executed', 'executed', 'rows', 'error'])
    expect(outcomes[1]).toMatchObject({ message: expect.stringContaining('2 rows affected') })
    expect(outcomes[2]).toMatchObject({ columns: ['a'], sql: 'SELECT * FROM r;' })
    expect(outcomes[3]).toMatchObject({ message: expect.stringContaining('syntax error') })
    expect(modified).toBe(true)
    expect(isDirty(db)).toBe(true)
    expect(db.schemata.get('main')!.tables.has('r')).toBe(true)
  })

  it('shows rows of INSERT … RETURNING as they are', () => {
    const db = openCoreTestDb()
    const { outcomes } = run(db, "INSERT INTO parent(name) VALUES ('zoe') RETURNING id, name")
    expect(outcomes[0]).toMatchObject({ kind: 'static', columns: ['id', 'name'], rows: [[4n, 'zoe']] })
  })

  it('leaves no savepoint behind when nothing changed', () => {
    const db = openCoreTestDb()
    run(db, 'SELECT 1; PRAGMA user_version;')
    expect(isDirty(db)).toBe(false)
  })

  it('skips BEGIN and COMMIT, which the app manages itself', () => {
    const db = openCoreTestDb()
    const { outcomes } = run(db, "BEGIN; INSERT INTO parent(name) VALUES ('x'); COMMIT;")
    expect(outcomes.map((o) => o.kind)).toEqual(['executed'])
    expect(isDirty(db)).toBe(true)
  })

  it('asks before PRAGMA assignments commit pending changes', () => {
    const db = openCoreTestDb()
    run(db, "INSERT INTO parent(name) VALUES ('x')")
    expect(run(db, 'PRAGMA user_version = 7').outcomes[0]).toMatchObject({
      kind: 'error',
      message: 'Execution aborted by user',
    })
    expect(run(db, 'PRAGMA user_version = 7', true).outcomes[0]!.kind).toBe('executed')
    expect(isDirty(db)).toBe(false)
    expect(querySingleValue(db, 'PRAGMA user_version')).toBe(7n)
  })
})

describe('query paging', () => {
  it('appends LIMIT/OFFSET when it can, and slices otherwise', () => {
    const db = openCoreTestDb()
    expect(isPageable('SELECT * FROM parent;')).toBe(true)
    expect(isPageable('SELECT * FROM parent LIMIT 2')).toBe(false)
    expect(isPageable('SELECT 1 UNION SELECT 2')).toBe(false)
    expect(isPageable('PRAGMA table_info(parent)')).toBe(false)
    expect(queryPage(db, 'SELECT name FROM parent ORDER BY id;', 1, 5)).toEqual([['bob'], ['carl']])
    expect(queryCount(db, 'SELECT name FROM parent -- all\n;')).toBe(3)
    expect(queryPage(db, 'PRAGMA table_info(parent)', 1, 1)[0]![1]).toBe('name')
    expect(queryCount(db, 'SELECT 1 UNION SELECT 2')).toBe(2)
  })
})
