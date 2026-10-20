import { describe, expect, it } from 'vitest'
import { isTransactionControl, needsCommitFirst, returnsRows, statementType } from '@shared/sql/statementType'

describe('statementType', () => {
  it('reads the first keyword after comments', () => {
    expect(statementType('  -- hi\n/* x */ select 1')).toBe('SELECT')
    expect(statementType('REPLACE INTO t VALUES (1)')).toBe('INSERT')
    expect(statementType('BEGIN')).toBe('OTHER')
    expect(statementType('')).toBe('OTHER')
  })

  it('knows which statements return rows', () => {
    expect(returnsRows('SELECT 1')).toBe(true)
    expect(returnsRows('PRAGMA table_info(t)')).toBe(true)
    expect(returnsRows('PRAGMA foreign_keys = 1')).toBe(false)
    expect(returnsRows('WITH x AS (SELECT 1) SELECT * FROM x')).toBe(true)
    expect(returnsRows('WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x')).toBe(false)
    expect(returnsRows('INSERT INTO t VALUES (1) RETURNING *')).toBe(false)
  })

  it('knows which statements commit pending changes', () => {
    expect(needsCommitFirst('PRAGMA journal_mode = WAL')).toBe(true)
    expect(needsCommitFirst('PRAGMA defer_foreign_keys = 1')).toBe(false)
    expect(needsCommitFirst('VACUUM')).toBe(true)
    expect(needsCommitFirst('PRAGMA user_version')).toBe(false)
  })

  it('recognises BEGIN and COMMIT', () => {
    expect(isTransactionControl('BEGIN TRANSACTION;')).toBe(true)
    expect(isTransactionControl('begin immediate')).toBe(true)
    expect(isTransactionControl('END;')).toBe(true)
    expect(isTransactionControl('COMMIT TRANSACTION')).toBe(true)
    expect(isTransactionControl('BEGINNING')).toBe(false)
  })
})
