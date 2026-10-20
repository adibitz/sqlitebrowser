import { describe, expect, it } from 'vitest'
import { schemaSql } from '@/features/schema/schemaSql'
import { SCHEMA } from '../../fixtures'

describe('schemaSql', () => {
  it('lists tables, then views, then indices and triggers that have SQL', () => {
    const sql = schemaSql(SCHEMA, null)
    const headings = sql.split('\n').filter((l) => l.startsWith('--'))
    expect(headings).toEqual([
      '-- Table: Customers',
      '-- Table: orders',
      '-- View: summary',
      '-- Index: idx_cust  (on orders)',
      '-- Trigger: trg  (on Customers)',
    ])
    expect(sql).toContain('CREATE TABLE orders (id, customer_id);')
  })

  it('limits to one table and optionally leaves out related objects', () => {
    const scoped = schemaSql(SCHEMA, { schema: 'main', name: 'orders' })
    expect(scoped).toContain('-- Index: idx_cust')
    expect(scoped).not.toContain('Customers')
    expect(schemaSql(SCHEMA, { schema: 'main', name: 'orders' }, false)).not.toContain('Index')
  })

  it('returns nothing for an empty database', () => {
    expect(schemaSql([], null)).toBe('')
  })
})
