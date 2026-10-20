import { describe, expect, it } from 'vitest'
import { changedPragmas, normalizePragmaValue, PRAGMAS } from '@shared/schema/pragmas'

const def = (name: string) => PRAGMAS.find((p) => p.name === name)!

describe('pragma values', () => {
  it('normalizes engine values for the form', () => {
    expect(normalizePragmaValue(def('journal_mode'), 'wal')).toBe('WAL')
    expect(normalizePragmaValue(def('foreign_keys'), 1n)).toBe(1)
    expect(normalizePragmaValue(def('user_version'), null)).toBe(0)
  })

  it('reports only values that changed, ignoring case', () => {
    expect(
      changedPragmas({ journal_mode: 'WAL', user_version: 1 }, { journal_mode: 'wal', user_version: 2 }),
    ).toEqual({ user_version: 2 })
  })
})
