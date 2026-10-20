// Port of the Y-axis rules of reference/sqliteview/ui/plot_dock.py (_assign_color_slots, y_columns).

/** One colour per series; more would repeat colours. */
export const MAX_SERIES = 8
/** Bar categories beyond this are unreadable and slow to draw. */
export const MAX_BARS = 500

/**
 * Colour slots of the checked Y columns: a column keeps its slot while it stays checked, so adding or
 * removing other series never recolours it. Columns beyond MAX_SERIES get no slot (they're unchecked).
 */
export function assignSlots(
  previous: Record<string, number>,
  checked: readonly string[],
): Record<string, number> {
  const slots: Record<string, number> = {}
  for (const name of checked) if (previous[name] !== undefined) slots[name] = previous[name]
  const used = new Set(Object.values(slots))
  for (const name of checked) {
    if (slots[name] !== undefined) continue
    let free = 0
    while (used.has(free)) free++
    if (free >= MAX_SERIES) continue
    slots[name] = free
    used.add(free)
  }
  return slots
}

/** Toggles a Y column; a new column is refused once MAX_SERIES are checked. */
export function toggleY(checked: readonly string[], name: string): string[] {
  if (checked.includes(name)) return checked.filter((n) => n !== name)
  return checked.length >= MAX_SERIES ? [...checked] : [...checked, name]
}
