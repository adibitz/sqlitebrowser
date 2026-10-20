import { describe, expect, it } from 'vitest'
import { fuzzyScore, paletteFilter } from '@/features/palette/fuzzyScore'

describe('fuzzyScore', () => {
  it('prefers substring matches near the start', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
    expect(fuzzyScore('open', 'Open database')).toBe(0)
    expect(fuzzyScore('data', 'Open database')).toBe(5)
  })

  it('matches subsequences with a gap penalty and rejects the rest', () => {
    // o(0) d(5): 4 skipped; b(9): 3 skipped -> 100 + 7 * 3
    expect(fuzzyScore('odb', 'Open database')).toBe(121)
    expect(fuzzyScore('xyz', 'Open database')).toBeNull()
  })

  it('ranks for cmdk: 0 hides, closer matches rank higher', () => {
    expect(paletteFilter('Open database', 'xyz')).toBe(0)
    expect(paletteFilter('Open database', 'open')).toBeGreaterThan(paletteFilter('Open database', 'odb'))
  })
})
