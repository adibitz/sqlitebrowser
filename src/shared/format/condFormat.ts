// Port of reference/sqliteview/core/condformat.py (upstream CondFormat). A rule pairs a filter in the
// filter-row syntax with a text and/or background colour; the first matching rule colours the cell.
// The worker asks SQLite which rule matches (see core/rows.ts), the same engine the filters use.
import { filterToSqlCondition } from './filters'

export interface CondFormat {
  /** Filter text; '' matches every value that isn't NULL or a BLOB. */
  filter: string
  /** '#rrggbb', or '' for the default colour. */
  fg: string
  bg: string
}

/** Background of a new rule: soft enough to read either theme's text on it. */
export const NEW_RULE_BACKGROUND = '#fff1b8'

/**
 * Port of addCondFormatToMap: a rule with the same condition is replaced in place, a catch-all rule
 * goes last, any other new rule goes first.
 */
export function addCondFormat(formats: readonly CondFormat[], next: CondFormat, escape = '\\'): CondFormat[] {
  const condition = filterToSqlCondition(next.filter, escape)
  const same = formats.findIndex((f) => filterToSqlCondition(f.filter, escape) === condition)
  if (same >= 0) return formats.map((f, i) => (i === same ? next : f))
  return next.filter ? [next, ...formats] : [...formats, next]
}

/** A non-empty filter that yields no SQL condition (e.g. '%') never matches anything. */
export function neverMatches(filter: string, escape = '\\'): boolean {
  return filter.trim() !== '' && !filterToSqlCondition(filter.trim(), escape)
}

function channel(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Near-black or near-white, whichever contrasts more with `background` (WCAG relative luminance). */
export function readableTextColor(background: string): string {
  const hex = /^#?([0-9a-f]{6})$/i.exec(background)?.[1]
  if (!hex) return '#1d2127'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.179 ? '#1d2127' : '#f1f3f8'
}

/** Text and background colour of a cell that `rule` matched. */
export function ruleColors(rule: CondFormat): { color?: string; backgroundColor?: string } {
  if (rule.fg) return { color: rule.fg, ...(rule.bg && { backgroundColor: rule.bg }) }
  if (rule.bg) return { color: readableTextColor(rule.bg), backgroundColor: rule.bg }
  return {}
}
