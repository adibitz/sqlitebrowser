// Port of reference/tests/test_core.py::test_query_builder.
import { describe, expect, it } from 'vitest'
import { OrderBy, Query, SortDirection } from '../../../../src/main/core/query'
import { ObjectIdentifier } from '@shared/sqlb/identifier'

describe('Query', () => {
  it('builds the browse and count queries', () => {
    const q = new Query(new ObjectIdentifier('main', 't'))
    q.columnNames = ['_rowid_', 'a', 'b']
    q.where.set('a', "LIKE '%x%'")
    q.orderBy = [new OrderBy('b', SortDirection.Descending)]
    expect(q.buildQuery(true)).toBe(
      'SELECT "_rowid_",* FROM "main"."t" WHERE "a" LIKE \'%x%\' ORDER BY "b" DESC',
    )
    expect(q.buildCountQuery().startsWith('SELECT COUNT(*) FROM "main"."t" WHERE')).toBe(true)
  })

  it('uses NULL as rowid for views and a combined key for composite keys', () => {
    const view = new Query(new ObjectIdentifier('main', 'v'))
    view.isView = true
    expect(view.buildQuery(true)).toBe('SELECT NULL,* FROM "main"."v"  ')
    const wr = new Query(new ObjectIdentifier('main', 'w'))
    wr.rowidColumns = ['a', 'b']
    expect(wr.buildQuery(true)).toContain('sqlb_make_single_value("a","b"),*')
  })

  it('applies global filters across every column', () => {
    const q = new Query(new ObjectIdentifier('main', 't'))
    q.columnNames = ['a', 'b']
    q.globalWhere = ["LIKE '%z%'"]
    expect(q.buildWherePart()).toBe(`WHERE ("a" LIKE '%z%' OR "b" LIKE '%z%')`)
  })

  it('reads display-formatted columns through their selector', () => {
    const q = new Query(new ObjectIdentifier('main', 't'))
    q.selectedColumns = [{ originalColumn: 'a', selector: 'upper("a")' }]
    q.where.set('a', "= 'X'")
    expect(q.buildQuery(false)).toBe(`SELECT upper("a") AS "a" FROM "main"."t" WHERE upper("a") = 'X' `)
  })
})
