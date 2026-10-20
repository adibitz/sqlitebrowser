// Port of reference/tests/test_core.py (filters) plus the filter builder helpers.
import { describe, expect, it } from 'vitest'
import {
  buildFilterText,
  describeFilter,
  filterToSqlCondition,
  parseFilterText,
  tokenizeGlobalFilter,
} from '@shared/format/filters'

describe('filterToSqlCondition', () => {
  it.each([
    ['abc', "LIKE '%abc%' ESCAPE '\\'"],
    ['a%', "LIKE 'a%' ESCAPE '\\'"],
    ['=5', "= '5'"],
    ['>5', '> 5'],
    ['>=x', ">= 'x'"],
    ['=NULL', 'IS NULL'],
    ['<>NULL', 'IS NOT NULL'],
    ["<>''", "<> ''"],
    ['1~10', 'BETWEEN 1 AND 10'],
    ['10~1', "LIKE '%10~1%' ESCAPE '\\'"],
    ['/^a.*/', "REGEXP '^a.*'"],
    ["it's", "LIKE '%it''s%' ESCAPE '\\'"],
    ['%', ''],
    ['', ''],
  ])('%s -> %s', (value, expected) => {
    expect(filterToSqlCondition(value)).toBe(expected)
  })
})

describe('tokenizeGlobalFilter', () => {
  it('keeps /regex with spaces/ as one term', () => {
    expect(tokenizeGlobalFilter('a  b /c d/')).toEqual(['a', 'b', '/c d/'])
  })
  it('falls back to splitting on spaces for an unclosed regex', () => {
    expect(tokenizeGlobalFilter('/a b')).toEqual(['/a', 'b'])
  })
})

describe('filter builder', () => {
  it('round-trips every operator', () => {
    const cases: [Parameters<typeof buildFilterText>[0], string, string][] = [
      ['contains', 'x', ''],
      ['equals', 'x', ''],
      ['not_equals', 'x', ''],
      ['starts', 'x', ''],
      ['ends', 'x', ''],
      ['gt', '5', ''],
      ['ge', '5', ''],
      ['lt', '5', ''],
      ['le', '5', ''],
      ['between', '1', '9'],
      ['regex', 'a+', ''],
      ['empty', '', ''],
      ['not_empty', '', ''],
      ['null', '', ''],
      ['not_null', '', ''],
    ]
    for (const [op, v, v2] of cases) {
      expect(parseFilterText(buildFilterText(op, v, v2))).toEqual([op, v, v2])
    }
  })

  it('describes filters in plain words', () => {
    expect(describeFilter('>5')).toBe('> 5')
    expect(describeFilter('abc')).toBe('contains “abc”')
    expect(describeFilter('a%b')).toBe('like “a%b”')
    expect(describeFilter('=NULL')).toBe('is NULL')
  })
})
