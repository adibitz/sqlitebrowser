import { describe, expect, it } from 'vitest'
import { commitsPendingChanges, lineOf, runRange } from '@/features/sql/runRange'

const text = 'SELECT 1;\nSELECT 2;\n\nVACUUM;'
const at = (cursor: number, selection: { from: number; to: number } | null = null) => ({
  text,
  selection,
  cursor,
  line: {
    from: text.lastIndexOf('\n', cursor - 1) + 1,
    to: text.indexOf('\n', cursor) === -1 ? text.length : text.indexOf('\n', cursor),
  },
})

describe('runRange', () => {
  it('runs everything, or only the selection', () => {
    expect(runRange('all', at(0))).toEqual({ from: 0, to: text.length })
    expect(runRange('all', at(0, { from: 10, to: 19 }))).toEqual({ from: 10, to: 19 })
  })

  it('runs the statement under the cursor', () => {
    expect(runRange('current', at(12))).toEqual({ from: 10, to: 19 })
  })

  it('runs the cursor line, and nothing on a blank line', () => {
    expect(runRange('line', at(3))).toEqual({ from: 0, to: 9 })
    expect(runRange('line', at(20))).toBeNull()
  })
})

describe('run helpers', () => {
  it('finds statements that commit pending changes', () => {
    expect(commitsPendingChanges(text, 0, 19)).toBe(false)
    expect(commitsPendingChanges(text, 0, text.length)).toBe(true)
  })

  it('numbers lines from 1', () => {
    expect(lineOf(text, 0)).toBe(1)
    expect(lineOf(text, 12)).toBe(2)
  })
})
