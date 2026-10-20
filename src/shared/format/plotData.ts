// Port of reference/sqliteview/core/plotdata.py (upstream PlotDock guessDataType and the conversion
// loop of updatePlot): rows -> plottable series. Drawing lives in renderer/features/plot.
import type { SqlValue } from '../types/values'
import { isBinary, valueToText } from './data'
import { parseRealText } from './numberText'

/** The pseudo column "Row #". */
export const ROW_NUMBER = -1

export type AxisType = 'numeric' | 'dateTime' | 'date' | 'time' | 'label'

export const AXIS_TYPE_LABELS: Record<AxisType, string> = {
  numeric: 'Numeric',
  dateTime: 'Date/Time',
  date: 'Date',
  time: 'Time',
  label: 'Label',
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

function utc(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0): number | null {
  const t = Date.UTC(y, mo - 1, d, h, mi, s, ms)
  const back = new Date(t)
  // Reject dates JavaScript would roll over (2024-02-31), as Python's fromisoformat does.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  if (h > 23 || mi > 59 || s > 59) return null
  return t
}

const fraction = (f: string | undefined): number => (f ? Math.round(Number(f) * 1000) : 0)

/** Dates and times as milliseconds since the epoch (UTC unless the text has an offset). */
export function parseTemporal(text: string): { type: AxisType; ms: number } | null {
  const t = text.trim()
  if (!/^\d/.test(t)) return null
  let m = t.length === 10 ? DATE.exec(t) : null
  if (m) {
    const ms = utc(+m[1]!, +m[2]!, +m[3]!)
    return ms === null ? null : { type: 'date', ms }
  }
  m = t.slice(0, 3).includes(':') && t.length <= 15 ? TIME.exec(t) : null
  if (m) {
    const ms = utc(1970, 1, 1, +m[1]!, +m[2]!, +(m[3] ?? 0), fraction(m[4]))
    return ms === null ? null : { type: 'time', ms }
  }
  m = DATE_TIME.exec(t)
  if (!m) return null
  let ms = utc(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0), fraction(m[7]))
  if (ms === null) return null
  const zone = m[8]
  if (zone && zone !== 'Z') {
    const sign = zone.startsWith('-') ? -1 : 1
    const digits = zone.slice(1).replace(':', '')
    ms -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2))) * 60_000
  }
  return { type: 'dateTime', ms }
}

/** A number for numbers and numeric text, else null. */
export function asNumber(value: SqlValue | boolean | undefined): number | null {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return parseRealText(value)
  return null
}

/** The common type of a column's non-NULL values; null when nothing is plottable (empty or BLOB). */
export function guessAxisType(values: Iterable<SqlValue | undefined>): AxisType | null {
  let found: AxisType | null = null
  for (const v of values) {
    if (v === null || v === undefined) continue
    if (isBinary(v)) return null
    const kind: AxisType = asNumber(v) !== null ? 'numeric' : (parseTemporal(valueToText(v))?.type ?? 'label')
    if (found === null || found === kind) found = kind
    else if ((found === 'date' && kind === 'dateTime') || (found === 'dateTime' && kind === 'date')) {
      found = 'dateTime'
    } else return 'label'
  }
  return found
}

/** Position of `value` on an axis: numbers as they are, dates as milliseconds since the epoch. */
export function toAxisValue(value: SqlValue | undefined, axis: AxisType): number | null {
  if (value === null || value === undefined) return null
  if (axis === 'numeric') return asNumber(value)
  if (axis === 'label') return null
  return parseTemporal(valueToText(value))?.ms ?? null
}

export interface PlotData {
  xType: AxisType
  /** X position per plotted row (the row's position for label axes). */
  xs: number[]
  /** X text per plotted row, for label axes, bars and tooltips. */
  labels: string[]
  /** Y column -> value per plotted row (null leaves a gap). */
  ys: Map<number, (number | null)[]>
}

/** Rows -> points. `x` may be ROW_NUMBER; rows whose X can't be placed are skipped. */
export function buildPlotData(
  rows: readonly (readonly SqlValue[])[],
  x: number,
  ys: readonly number[],
  xType?: AxisType | null,
): PlotData {
  const type: AxisType =
    x === ROW_NUMBER ? 'numeric' : (xType ?? guessAxisType(rows.map((r) => r[x])) ?? 'label')
  const out: PlotData = { xType: type, xs: [], labels: [], ys: new Map(ys.map((c) => [c, []])) }
  rows.forEach((r, i) => {
    const rawX = x === ROW_NUMBER ? i + 1 : r[x]
    const xv =
      type === 'label' ? out.xs.length : toAxisValue(typeof rawX === 'number' ? rawX : (rawX ?? null), type)
    if (xv === null) return
    out.xs.push(xv)
    out.labels.push(rawX === null || rawX === undefined ? 'NULL' : valueToText(rawX))
    for (const c of ys) out.ys.get(c)!.push(asNumber(r[c]))
  })
  return out
}
