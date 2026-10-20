// Port of reference/tests/test_core.py::test_split_statements_with_trigger, plus edge cases.
import { describe, expect, it } from 'vitest'
import { isBlank, splitStatements, statementAt } from '@shared/sql/sqlsplit'

describe('splitStatements', () => {
  it('keeps trigger bodies, strings and comments together', () => {
    const sql =
      "CREATE TRIGGER t AFTER INSERT ON x BEGIN SELECT 1; SELECT 2; END; SELECT ';'; -- c\n SELECT 3"
    const parts = splitStatements(sql)
    expect(parts).toHaveLength(3)
    expect(parts[0]!.endsWith('END;')).toBe(true)
    expect(parts[2]!.trim()).toBe('SELECT 3')
    expect(statementAt(sql, sql.indexOf("';'"))?.text.startsWith("SELECT ';'")).toBe(true)
  })

  it('skips empty statements and comment-only text', () => {
    expect(splitStatements(';;  -- nothing\n/* x */;')).toEqual([])
    expect(isBlank('  ; -- x\n')).toBe(true)
    expect(isBlank('SELECT 1')).toBe(false)
  })

  it('does not split inside quoted identifiers or block comments', () => {
    expect(splitStatements('SELECT "a;b" FROM [c;d]; /* ; */ SELECT `e;`;')).toEqual([
      'SELECT "a;b" FROM [c;d];',
      'SELECT `e;`;',
    ])
  })

  it('treats an unterminated string as running to the end', () => {
    expect(splitStatements("SELECT 'abc; SELECT 2")).toEqual(["SELECT 'abc; SELECT 2"])
  })

  it('handles CREATE TEMP TRIGGER and EXPLAIN', () => {
    const sql = 'CREATE TEMP TRIGGER t AFTER DELETE ON x BEGIN DELETE FROM y; END; EXPLAIN SELECT 1;'
    expect(splitStatements(sql)).toHaveLength(2)
  })

  it('returns the last statement when the cursor is after the end', () => {
    expect(statementAt('SELECT 1; SELECT 2;', 100)?.text).toBe('SELECT 2;')
    expect(statementAt('', 0)).toBeNull()
  })
})
