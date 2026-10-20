import { describe, expect, it } from 'vitest'
import { assignSlots, MAX_SERIES, toggleY } from '@/features/plot/plotChoices'

describe('plot Y columns', () => {
  it('keeps a column’s colour while other columns come and go', () => {
    let slots = assignSlots({}, ['price', 'stock'])
    expect(slots).toEqual({ price: 0, stock: 1 })
    slots = assignSlots(slots, ['stock'])
    expect(slots).toEqual({ stock: 1 })
    slots = assignSlots(slots, ['stock', 'qty'])
    expect(slots).toEqual({ stock: 1, qty: 0 })
  })

  it('allows at most one series per colour', () => {
    const names = Array.from({ length: MAX_SERIES }, (_, i) => `c${i}`)
    expect(toggleY(names, 'extra')).toEqual(names)
    expect(toggleY(names, 'c0')).toEqual(names.slice(1))
    expect(Object.keys(assignSlots({}, [...names, 'extra']))).toHaveLength(MAX_SERIES)
  })
})
