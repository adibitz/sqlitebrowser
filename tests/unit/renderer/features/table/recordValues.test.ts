import { describe, expect, it } from 'vitest'
import { insertPreview, recordValues } from '@/features/table/data/recordValues'
import { table } from '../../fixtures'

const items = { schema: 'main', name: 'items' }

describe('insert record values', () => {
  it('leaves empty values to defaults and reads NULL as NULL', () => {
    expect(recordValues(['a', 'b', 'c'], ['', 'null', 'x'])).toEqual({ b: null, c: 'x' })
  })

  it('previews the INSERT with values typed by column affinity', () => {
    const t = table('items', 'table', ['id', 'qty'])
    t.columns[1] = { ...t.columns[1]!, type: 'TEXT' }
    expect(insertPreview(items, t.columns, { id: '7', qty: "o'k" })).toBe(
      'INSERT INTO "main"."items" ("id", "qty") VALUES (7, \'o\'\'k\');',
    )
    expect(insertPreview(items, t.columns, {})).toBe('INSERT INTO "main"."items" DEFAULT VALUES;')
  })
})
