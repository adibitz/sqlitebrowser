import { describe, expect, it } from 'vitest'
import { indexableTables, indexDraftFor, indexSql, validateIndex } from '@/features/createIndex/indexDraft'
import { SCHEMA } from '../../fixtures'

const orders = { schema: 'main', name: 'orders' }

describe('index draft', () => {
  it('offers only real tables, sorted by name', () => {
    expect(indexableTables(SCHEMA).map((t) => t.name)).toEqual(['Customers', 'orders'])
  })

  it('builds CREATE INDEX from the checked columns', () => {
    const d = indexDraftFor(SCHEMA, orders)
    expect(d.columns.map((c) => c.name)).toEqual(['id', 'customer_id'])
    expect(indexSql(d)).toBe('')
    const ready = {
      ...d,
      name: ' idx_orders ',
      unique: true,
      where: 'id > 0',
      columns: d.columns.map((c, i) => (i === 1 ? { ...c, checked: true, order: 'DESC' as const } : c)),
    }
    expect(indexSql(ready)).toBe(
      'CREATE UNIQUE INDEX "idx_orders" ON "orders" (\n\t"customer_id"\tDESC\n) WHERE id > 0;',
    )
    expect(validateIndex(ready, SCHEMA)).toBe('')
  })

  it('explains what blocks creating it', () => {
    const d = indexDraftFor(SCHEMA, orders)
    expect(validateIndex(d, SCHEMA)).toMatch(/name for the index/)
    expect(validateIndex({ ...d, name: 'IDX_CUST' }, SCHEMA)).toBe(
      "An index named 'IDX_CUST' already exists.",
    )
    expect(validateIndex({ ...d, name: 'x' }, SCHEMA)).toMatch(/at least one column/)
    expect(validateIndex({ ...indexDraftFor(SCHEMA, null), name: 'x' }, SCHEMA)).toMatch(/select a table/)
  })

  it('keeps name and options when the table changes', () => {
    const d = { ...indexDraftFor(SCHEMA, orders), name: 'keep', unique: true }
    const next = indexDraftFor(SCHEMA, { schema: 'main', name: 'Customers' }, d)
    expect(next).toMatchObject({ name: 'keep', unique: true })
    expect(next.columns.map((c) => c.name)).toEqual(['id', 'email'])
  })
})
