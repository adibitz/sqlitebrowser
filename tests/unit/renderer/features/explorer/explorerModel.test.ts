import { describe, expect, it } from 'vitest'
import {
  buildExplorerTree,
  defaultExpanded,
  explorerSummary,
  filterTree,
  visibleRows,
} from '@/features/explorer/explorerModel'
import { SCHEMA } from '../../fixtures'

describe('explorer model', () => {
  it('groups objects, sorts by name and hides an empty temp schema', () => {
    const tree = buildExplorerTree(SCHEMA)
    expect(tree.map((n) => n.label)).toEqual(['Tables', 'Views', 'Indices', 'Triggers', 'System'])
    expect(tree[0]!.children.map((n) => n.label)).toEqual(['Customers', 'orders'])
    expect(tree[0]!.detail).toBe('2')
  })

  it('adds schema roots when a database is attached', () => {
    const attached = { ...SCHEMA[0]!, name: 'aux' }
    const tree = buildExplorerTree([SCHEMA[0]!, attached])
    expect(tree.map((n) => [n.kind, n.label])).toEqual([
      ['schema', 'main'],
      ['schema', 'aux'],
    ])
  })

  it('filters by object name and keeps the columns of matching tables', () => {
    const tree = filterTree(buildExplorerTree(SCHEMA), 'cust')
    const tables = tree.find((n) => n.label === 'Tables')!
    expect(tables.children.map((n) => n.label)).toEqual(['Customers', 'orders'])
    expect(tables.children[0]!.children.map((c) => c.label)).toEqual(['id', 'email'])
    expect(tables.children[1]!.children.map((c) => c.label)).toEqual(['customer_id'])
    expect(filterTree(buildExplorerTree(SCHEMA), 'zzz')).toEqual([])
  })

  it('lists only rows under expanded nodes', () => {
    const tree = buildExplorerTree(SCHEMA)
    const rows = visibleRows(tree, defaultExpanded(SCHEMA))
    expect(rows.map((r) => r.node.label)).toEqual([
      'Tables',
      'Customers',
      'orders',
      'Views',
      'Indices',
      'Triggers',
      'System',
    ])
    expect(rows[1]).toMatchObject({ depth: 1, expanded: false, hasChildren: true })
    expect(visibleRows(tree, new Set(), true).length).toBeGreaterThan(rows.length)
  })

  it('summarises tables and views', () => {
    expect(explorerSummary(SCHEMA)).toBe('2 tables · 1 view')
  })
})
