import { describe, expect, it } from 'vitest'
import { activeFormats } from '@/features/table/data/activeFormats'
import { gridColumns } from '@/features/table/data/gridColumns'
import type { BrowseState } from '@/store/tabs'
import { table } from '../../fixtures'

const orders = table('orders', 'table', ['id', 'customer_id', 'total'])
const red = { filter: '>5', fg: '#ff0000', bg: '' }

function browseState(patch: Partial<BrowseState>): BrowseState {
  return {
    filters: {},
    globalFilter: '',
    sort: [],
    pageSize: 100,
    page: 0,
    hiddenColumns: [],
    columnWidths: {},
    pseudoPk: [],
    rowSelection: false,
    displayFormats: {},
    condFormats: {},
    ...patch,
  }
}

describe('active formats', () => {
  it('keeps only formats of columns the table still has, in column order', () => {
    const browse = browseState({
      displayFormats: { total: 'round("total")', gone: 'upper("gone")' },
      condFormats: { total: [red], gone: [red], id: [red], customer_id: [] },
    })
    expect(activeFormats(orders, browse)).toEqual({
      displayFormats: { total: 'round("total")' },
      condFormats: [
        { column: 'id', rules: [red] },
        { column: 'total', rules: [red] },
      ],
    })
  })

  it('tells the grid where each column reads its rule match', () => {
    const browse = browseState({ displayFormats: { id: 'hex("id")' }, condFormats: { total: [red] } })
    const columns = gridColumns(orders, browse)
    expect(columns.map((c) => [c.name, c.dataIndex, c.formatted, c.condFormat?.dataIndex])).toEqual([
      ['id', 1, true, undefined],
      ['customer_id', 2, false, undefined],
      ['total', 3, false, 4],
    ])
  })
})
