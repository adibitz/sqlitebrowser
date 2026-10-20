// Port of reference/sqliteview/core/settings.py (DEFAULTS).
// Keys keep the Python 'group/name' form. Recent files and window state moved to their own storage
// (recent_files table, 'MainWindow/bounds').
import { z } from 'zod'

export const THEMES = ['system', 'light', 'dark'] as const
export const DENSITIES = ['comfortable', 'compact'] as const

const windowBounds = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(400),
  height: z.number().int().min(300),
  maximized: z.boolean(),
})

export const settingsSchema = z.object({
  'db/defaultencoding': z.string().default('UTF-8'),
  'db/defaultlocation': z.string().default(''), // '' = the user's home folder
  'db/foreignkeys': z.boolean().default(true),
  'db/prefetchsize': z.number().int().positive().default(50_000),
  'db/defaultsqltext': z.string().default(''),
  'db/hideschemalinebreaks': z.boolean().default(true),
  'exportcsv/firstrowheader': z.boolean().default(true),
  'exportcsv/separator': z.string().max(1).default(','),
  'exportcsv/quotecharacter': z.string().max(1).default('"'),
  'exportcsv/newlinecharacters': z.string().default('\r\n'),
  'importcsv/firstrowheader': z.boolean().default(true),
  'importcsv/trimfields': z.boolean().default(true),
  'importcsv/separatetables': z.boolean().default(false),
  'importcsv/separator': z.string().max(1).default(','),
  'importcsv/quotecharacter': z.string().max(1).default('"'),
  'importcsv/encoding': z.string().default('UTF-8'),
  'importcsv/notypedetection': z.boolean().default(false),
  'exportsql/insertcolnames': z.boolean().default(false),
  'exportsql/insertmultiple': z.boolean().default(false),
  'exportsql/keeporiginal': z.boolean().default(false),
  'exportsql/oldschema': z.number().int().default(0),
  'exportjson/prettyprint': z.boolean().default(true),
  'General/maxRecentFiles': z.number().int().min(1).max(50).default(10),
  'General/theme': z.enum(THEMES).default('system'),
  'General/uiDensity': z.enum(DENSITIES).default('comfortable'),
  'General/fontsize': z.number().int().min(0).default(0), // 0 = platform default
  'General/onboarded': z.boolean().default(false),
  'databrowser/font': z.string().default(''),
  'databrowser/fontsize': z.number().int().min(0).default(0),
  'databrowser/symbol_limit': z.number().int().positive().default(5000),
  'databrowser/rows_limit': z.number().int().positive().default(10_000_000),
  'databrowser/complete_threshold': z.number().int().positive().default(1000),
  'databrowser/image_preview': z.boolean().default(false),
  'databrowser/null_text': z.string().default('NULL'),
  'databrowser/blob_text': z.string().default('BLOB'),
  'databrowser/filter_escape': z.string().max(1).default('\\'),
  'databrowser/filter_delay': z.number().int().min(0).default(200),
  'databrowser/page_size': z.number().int().min(0).default(100), // 0 = one scrolling list
  'databrowser/cell_word_wrap': z.boolean().default(true),
  'editor/font': z.string().default(''),
  'editor/fontsize': z.number().int().positive().default(10),
  'editor/tabsize': z.number().int().positive().default(4),
  'editor/wrap_lines': z.boolean().default(false),
  'editor/auto_completion': z.boolean().default(true),
  'editor/upper_keywords': z.boolean().default(true),
  'editor/error_indicators': z.boolean().default(true),
  'editor/identifier_quotes': z.number().int().min(0).max(2).default(0),
  'extensions/list': z.array(z.string()).default([]),
  'extensions/disableregex': z.boolean().default(false),
  'extensions/enable_load_extension': z.boolean().default(false),
  'MainWindow/bounds': windowBounds.nullable().default(null),
  // The MCP server Claude Code (or another MCP client) connects to; off until the user turns it on.
  'MCP/enabled': z.boolean().default(false),
  'MCP/port': z.number().int().min(1024).max(65535).default(3940),
})

export type Settings = z.infer<typeof settingsSchema>
export type SettingKey = keyof Settings
export type Theme = (typeof THEMES)[number]
export type Density = (typeof DENSITIES)[number]

export const SETTING_KEYS = Object.keys(settingsSchema.shape) as SettingKey[]

/** Validates one value for one key; throws a ZodError when it doesn't fit. */
export function parseSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  return settingsSchema.shape[key].parse(value) as Settings[K]
}

/** Builds a full settings object from stored values, using defaults for anything missing or invalid. */
export function settingsWithDefaults(stored: Partial<Record<string, unknown>>): Settings {
  const out: Record<string, unknown> = {}
  for (const key of SETTING_KEYS) {
    const result = settingsSchema.shape[key].safeParse(stored[key])
    out[key] = result.success ? result.data : settingsSchema.shape[key].parse(undefined)
  }
  return out as Settings
}
