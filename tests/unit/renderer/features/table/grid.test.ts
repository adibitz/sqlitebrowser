import { describe, expect, it } from 'vitest'
import { displayCell } from '@/features/table/data/cellDisplay'
import { sortIndicator, toggleSort } from '@/features/table/data/gridColumns'
import { RowCache } from '@/features/table/data/rowCache'
import {
  cellSelection,
  clickRow,
  extendSelection,
  moveFocus,
  selectAll,
  selectedColumns,
  selectedRows,
  selectionSummary,
} from '@/features/table/data/selection'

describe('selection', () => {
  it('extends a cell rectangle in any direction', () => {
    const sel = extendSelection(cellSelection({ row: 5, col: 3 }), { row: 2, col: 1 })
    expect(selectedRows(sel)).toEqual([2, 3, 4, 5])
    expect(selectedColumns(sel, 10)).toEqual([1, 2, 3])
    expect(selectionSummary(sel, 10)).toBe('12 cells selected')
  })

  it('selects rows with Ctrl and Shift like the Python grid', () => {
    let sel = clickRow(null, 2, { ctrl: false, shift: false })
    sel = clickRow(sel, 3, { ctrl: true, shift: false })
    sel = clickRow(sel, 5, { ctrl: true, shift: false })
    expect(selectedRows(sel)).toEqual([2, 3, 5])
    expect(selectionSummary(sel, 4)).toBe('3 rows selected')
    sel = clickRow(sel, 3, { ctrl: true, shift: false })
    expect(selectedRows(sel)).toEqual([2, 5])
    expect(
      selectedRows(
        clickRow(clickRow(null, 1, { ctrl: false, shift: false }), 4, { ctrl: false, shift: true }),
      ),
    ).toEqual([1, 2, 3, 4])
  })

  it('moves the focus inside the grid and selects everything', () => {
    expect(moveFocus(null, 5, 5, 3, 2, false)?.focus).toEqual({ row: 2, col: 1 })
    expect(moveFocus(cellSelection({ row: 0, col: 0 }), -1, 0, 3, 2, false)?.focus).toEqual({
      row: 0,
      col: 0,
    })
    expect(selectionSummary(selectAll(3, 2), 2)).toBe('6 cells selected')
    expect(selectAll(0, 2)).toBeNull()
  })
})

describe('sorting', () => {
  it('toggles ascending, descending and adds secondary columns', () => {
    let sort = toggleSort([], 'a', false)
    expect(sort).toEqual([{ column: 'a', direction: 'asc' }])
    sort = toggleSort(sort, 'a', false)
    expect(sort).toEqual([{ column: 'a', direction: 'desc' }])
    sort = toggleSort(sort, 'b', true)
    expect(sort).toEqual([
      { column: 'a', direction: 'desc' },
      { column: 'b', direction: 'asc' },
    ])
    expect(sortIndicator(sort, 'b')).toBe('▲²')
    expect(sortIndicator([{ column: 'a', direction: 'desc' }], 'a')).toBe('▼')
    expect(sortIndicator(sort, 'c')).toBe('')
  })
})

describe('cell display', () => {
  const opts = { nullText: 'NULL', blobText: 'BLOB', symbolLimit: 5 }
  it('shows NULL, BLOB, numbers and one-line text', () => {
    expect(displayCell(null, opts)).toEqual({ text: 'NULL', kind: 'null' })
    expect(displayCell(Uint8Array.of(0, 1, 2), opts)).toEqual({ text: 'BLOB', kind: 'blob' })
    expect(displayCell(12n, opts)).toEqual({ text: '12', kind: 'number' })
    expect(displayCell('a\nb', opts).text).toBe('a ↵ b')
    expect(displayCell('abcdefgh', opts).text).toBe('abcde …')
  })
})

describe('RowCache', () => {
  it('loads chunks once, serves ranges and patches rows', async () => {
    const calls: [number, number][] = []
    const cache = new RowCache(
      async () => 600,
      async (offset, limit) => {
        calls.push([offset, limit])
        return Array.from({ length: Math.min(limit, 600 - offset) }, (_, i) => [
          BigInt(offset + i),
          `r${offset + i}`,
        ])
      },
    )
    cache.start()
    cache.ensure(10, 20)
    cache.ensure(15, 30)
    const rows = await cache.range(240, 260)
    expect(rows.map((r) => r[1])).toEqual(Array.from({ length: 20 }, (_, i) => `r${240 + i}`))
    expect(calls).toEqual([
      [0, 250],
      [250, 250],
    ])
    expect(cache.total).toBe(600)
    const before = cache.rowAt(3)
    cache.patch(3, 1, 'changed')
    expect(cache.rowAt(3)).not.toBe(before)
    expect(cache.rowAt(3)?.[1]).toBe('changed')
  })

  it('reports load errors', async () => {
    const cache = new RowCache(
      async () => {
        throw new Error('boom')
      },
      async () => [],
      (e) => (e as Error).message,
    )
    cache.start()
    await new Promise((r) => setTimeout(r, 0))
    expect(cache.error).toBe('boom')
  })

  it('still notifies after start, dispose, start (React StrictMode mounts effects twice)', async () => {
    const cache = new RowCache(
      async () => 0,
      async () => [],
    )
    cache.start()
    cache.dispose()
    let notified = 0
    cache.subscribe(() => notified++)
    cache.start()
    await new Promise((r) => setTimeout(r, 0))
    expect(cache.total).toBe(0)
    expect(notified).toBeGreaterThan(0)
  })
})
