// Port of reference/sqliteview/ui/command_palette.py (fuzzy_score).

/** Subsequence match; lower is better. null when `query` doesn't match `text`. */
export function fuzzyScore(query: string, text: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const direct = t.indexOf(q)
  if (direct >= 0) return direct
  let pos = -1
  let score = 0
  for (const ch of q) {
    const next = t.indexOf(ch, pos + 1)
    if (next < 0) return null
    score += (next - pos - 1) * 3
    pos = next
  }
  return 100 + score
}

/** cmdk ranking (0 hides, higher ranks first) from the fuzzy score of the item's search text. */
export function paletteFilter(value: string, search: string, keywords?: string[]): number {
  const text = [value, ...(keywords ?? [])].join(' ')
  const score = fuzzyScore(search.trim(), text)
  return score === null ? 0 : 1 / (1 + score)
}
