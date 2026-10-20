// Port of reference/tests/test_core.py (parser section).
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { parseIndex } from '@shared/parser/createIndex'
import { parseTable } from '@shared/parser/createTable'

describe('parseTable', () => {
  it('lifts column constraints and regenerates valid SQL', () => {
    const t = parseTable(
      'CREATE TABLE "t" (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT NOT NULL DEFAULT \'x\', ' +
        'b REAL CHECK(b > 0) UNIQUE, c INT REFERENCES other(x) ON DELETE CASCADE, ' +
        'd INT GENERATED ALWAYS AS (id+1) VIRTUAL, CONSTRAINT u UNIQUE(a, b), FOREIGN KEY(b) REFERENCES z(y)) STRICT',
    )
    expect(t.fullyParsed).toBe(true)
    expect(t.name).toBe('t')
    expect(t.fieldNames()).toEqual(['id', 'a', 'b', 'c', 'd'])
    expect(t.primaryKeyNames()).toEqual(['id'])
    expect(t.primaryKey()?.autoIncrement).toBe(true)
    expect(t.fields[1]!.notNull).toBe(true)
    expect(t.fields[1]!.defaultValue).toBe("'x'")
    expect(t.fields[2]!.check).toBe('b > 0')
    expect(t.fields[2]!.unique).toBe(true)
    expect(t.foreignKey(['c'])?.table).toBe('other')
    expect(t.foreignKey(['c'])?.constraint).toBe('ON DELETE CASCADE')
    expect(t.fields[4]!.generated?.expression).toBe('id+1')
    expect(t.strict).toBe(true)

    const sql = t.sql()
    const con = new Database(':memory:')
    con.exec('CREATE TABLE other(x PRIMARY KEY); CREATE TABLE z(y PRIMARY KEY);')
    expect(() => con.exec(sql)).not.toThrow()
    con.close()
    const t2 = parseTable(sql)
    expect(t2.fieldNames()).toEqual(t.fieldNames())
    expect(t2.primaryKeyNames()).toEqual(['id'])
  })

  it('reads type names and quoted keywords used as column names', () => {
    const t = parseTable(
      'CREATE TABLE x ("key" unsigned big int, [order] varchar(10, 2), `check` text, value)',
    )
    expect(t.fullyParsed).toBe(true)
    expect(t.fields.map((f) => [f.name, f.type])).toEqual([
      ['key', 'unsigned big int'],
      ['order', 'varchar(10, 2)'],
      ['check', 'text'],
      ['value', ''],
    ])
  })

  it('handles WITHOUT ROWID and virtual tables', () => {
    const t = parseTable('CREATE TABLE w(a, b, PRIMARY KEY(a,b)) WITHOUT ROWID')
    expect(t.withoutRowid).toBe(true)
    expect(t.rowidColumns()).toEqual(['a', 'b'])
    const v = parseTable('CREATE VIRTUAL TABLE f USING fts5(a, b)')
    expect(v.isVirtual()).toBe(true)
    expect(v.virtualUsing).toBe('fts5(a, b)')
  })

  it('falls back (not fully parsed) for CREATE TABLE … AS SELECT', () => {
    expect(parseTable('CREATE TABLE t AS SELECT 1').fullyParsed).toBe(false)
  })

  it('keeps the original SQL', () => {
    const sql = 'CREATE TABLE a(b)'
    expect(parseTable(sql).originalSql).toBe(sql)
  })

  it('treats garbage as not parsed instead of throwing', () => {
    expect(parseTable('CREATE TABLE (((').fullyParsed).toBe(false)
    expect(parseTable('').fullyParsed).toBe(false)
  })
})

describe('parseIndex', () => {
  it('reads unique, collations, order, expressions and WHERE', () => {
    const i = parseIndex('CREATE UNIQUE INDEX "i" ON t (a COLLATE NOCASE, b DESC, lower(c)) WHERE a > 1')
    expect(i.fullyParsed).toBe(true)
    expect(i.unique).toBe(true)
    expect(i.table).toBe('t')
    expect(i.fields.map((c) => c.order)).toEqual(['', 'DESC', ''])
    expect(i.fields[2]!.isExpression).toBe(true)
    expect(i.whereExpr).toBe('a > 1')
  })
})
