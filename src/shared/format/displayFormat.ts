// Port of reference/sqliteview/core/display_format.py (upstream ColumnDisplayFormatDialog presets).
// A display format is an SQL expression shown instead of the column: SELECT <format> AS "column".
import { escapeIdentifier } from '../sqlb/identifier'

export interface DisplayPreset {
  key: string
  label: string
  /** `{c}` stands for the quoted column name. */
  template: string
}

/** Presets in menu order; null marks a separator. */
export const DISPLAY_PRESETS: (DisplayPreset | null)[] = [
  { key: 'decimal', label: 'Decimal number', template: "printf('%d', {c})" },
  { key: 'exponent', label: 'Exponent notation', template: "printf('%e', {c})" },
  { key: 'hexblob', label: 'Hex blob', template: 'hex({c})' },
  { key: 'hex', label: 'Hex number', template: "printf('0x%x', {c})" },
  { key: 'octal', label: 'Octal number', template: "printf('%o', {c})" },
  { key: 'round', label: 'Round number', template: 'round({c})' },
  null,
  { key: 'appleDate', label: 'Apple NSDate to date', template: "datetime('2001-01-01', {c} || ' seconds')" },
  {
    key: 'javaEpoch',
    label: 'Java epoch (milliseconds) to date',
    template: "strftime('%Y-%m-%d %H:%M:%S.', {c}/1000, 'unixepoch') || ({c}%1000)",
  },
  {
    key: 'dotNetTicks',
    label: '.NET DateTime.Ticks to date',
    template: "datetime({c} / 10000000 - 62135596800, 'unixepoch')",
  },
  { key: 'julian', label: 'Julian day to date', template: 'datetime({c})' },
  { key: 'epoch', label: 'Unix epoch to date', template: "datetime({c}, 'unixepoch')" },
  {
    key: 'epochLocalTime',
    label: 'Unix epoch to local time',
    template: "datetime({c}, 'unixepoch', 'localtime')",
  },
  {
    key: 'webkitEpoch',
    label: 'WebKit / Chromium epoch to date',
    template: "datetime({c} / 1e6 - 11644473600, 'unixepoch')",
  },
  {
    key: 'webkitEpochLocalTime',
    label: 'WebKit / Chromium epoch to local time',
    template: "datetime({c} / 1e6 - 11644473600, 'unixepoch', 'localtime')",
  },
  { key: 'winDate', label: 'Windows DATE to date', template: "datetime('1899-12-30', {c} || ' days')" },
  { key: 'ddmmyyyyDate', label: 'Date as dd/mm/yyyy', template: "strftime('%d/%m/%Y', {c})" },
  null,
  { key: 'lower', label: 'Lower case', template: 'lower({c})' },
  { key: 'upper', label: 'Upper case', template: 'upper({c})' },
  null,
  {
    key: 'guid',
    label: 'Binary GUID to text',
    template:
      "substr(hex({c}), 7, 2) || substr(hex({c}), 5, 2) || substr(hex({c}), 3, 2) || substr(hex({c}), 1, 2) || '-' || " +
      "substr(hex({c}), 11, 2) || substr(hex({c}), 9, 2) || '-' || substr(hex({c}), 15, 2) || substr(hex({c}), 13, 2) || " +
      "'-' || substr(hex({c}), 17, 4) || '-' || substr(hex({c}), 21, 12)",
  },
  { key: 'json', label: 'JSON', template: 'json({c})' },
]

/** The SQL for preset `key` applied to `column`; 'default' is the bare column. */
export function presetSelector(key: string, column: string): string {
  const c = escapeIdentifier(column)
  if (key === 'default') return c
  const preset = DISPLAY_PRESETS.find((p) => p?.key === key)
  if (!preset) throw new Error(`Unknown display format ${key}`)
  return preset.template.replaceAll('{c}', c)
}

/** Key of the preset that produced `selector`: 'default', a preset key, or 'custom'. */
export function matchPreset(selector: string, column: string): string {
  if (!selector || selector === escapeIdentifier(column)) return 'default'
  for (const p of DISPLAY_PRESETS) {
    if (p && presetSelector(p.key, column) === selector) return p.key
  }
  return 'custom'
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The part of upstream's check that needs no database: a function call applied to the column. */
export function displayFormatShapeError(selector: string, column: string): string {
  const c = escapeIdentifier(column)
  const call = new RegExp(`[a-z]+[a-z_0-9]* *\\(.*${escapeRegExp(c)}.*\\)`, 'is')
  if (selector !== c && !call.test(selector)) {
    return `Custom display format must contain a function call applied to ${c}`
  }
  return ''
}
