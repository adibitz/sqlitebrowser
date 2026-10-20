// Port of reference/sqliteview/ui/dialogs/preferences.py: the settings this app acts on, by page.
// Settings the Python app had but this one doesn't use yet are left out rather than shown dead.
import {
  CodeIcon,
  DatabaseIcon,
  type LucideIcon,
  PlugIcon,
  PuzzleIcon,
  SettingsIcon,
  TableIcon,
} from 'lucide-react'
import type { SettingKey } from '@shared/settings/schema'

export type PreferenceField =
  | { kind: 'bool'; key: SettingKey; label: string }
  | { kind: 'int'; key: SettingKey; label: string; min: number; max: number; suffix?: string }
  | { kind: 'text'; key: SettingKey; label: string; maxLength?: number }
  | { kind: 'choice'; key: SettingKey; label: string; choices: { label: string; value: string | number }[] }
  | { kind: 'folder'; key: SettingKey; label: string }
  | { kind: 'sql'; key: SettingKey; label: string; placeholder: string }
  | { kind: 'extensions'; key: SettingKey; label: string }
  /** The MCP server's status, the connect command and the token; acts at once (it isn't a setting). */
  | { kind: 'mcpConnection'; key: SettingKey; label: string }

export interface PreferencePage {
  id: string
  title: string
  icon: LucideIcon
  /** When the settings take effect, if not at once. */
  note?: string
  fields: PreferenceField[]
}

export const PREFERENCE_PAGES: PreferencePage[] = [
  {
    id: 'general',
    title: 'General',
    icon: SettingsIcon,
    fields: [
      {
        kind: 'choice',
        key: 'General/theme',
        label: 'Theme',
        choices: [
          { label: 'Follow system', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      {
        kind: 'choice',
        key: 'General/uiDensity',
        label: 'Density',
        choices: [
          { label: 'Comfortable', value: 'comfortable' },
          { label: 'Compact', value: 'compact' },
        ],
      },
      { kind: 'int', key: 'General/maxRecentFiles', label: 'Recent files', min: 1, max: 50 },
    ],
  },
  {
    id: 'database',
    title: 'Database',
    icon: DatabaseIcon,
    note: 'These apply to the next database you open.',
    fields: [
      { kind: 'folder', key: 'db/defaultlocation', label: 'Default folder' },
      {
        kind: 'choice',
        key: 'db/defaultencoding',
        label: 'New database encoding',
        choices: ['UTF-8', 'UTF-16', 'UTF-16le', 'UTF-16be'].map((e) => ({ label: e, value: e })),
      },
      { kind: 'bool', key: 'db/foreignkeys', label: 'Enforce foreign keys (PRAGMA foreign_keys)' },
      {
        kind: 'sql',
        key: 'db/defaultsqltext',
        label: 'SQL to run on open',
        placeholder: 'SQL executed after opening a database, e.g. PRAGMA settings',
      },
    ],
  },
  {
    id: 'browser',
    title: 'Data browser',
    icon: TableIcon,
    fields: [
      { kind: 'text', key: 'databrowser/null_text', label: 'Text for NULL', maxLength: 50 },
      { kind: 'text', key: 'databrowser/blob_text', label: 'Text for BLOB', maxLength: 50 },
      {
        kind: 'int',
        key: 'databrowser/symbol_limit',
        label: 'Truncate text after',
        min: 1,
        max: 1_000_000,
        suffix: 'characters',
      },
      {
        kind: 'int',
        key: 'databrowser/page_size',
        label: 'Rows per page',
        min: 0,
        max: 100_000,
        suffix: '0 = one list',
      },
      { kind: 'text', key: 'databrowser/filter_escape', label: 'Filter escape character', maxLength: 1 },
      {
        kind: 'int',
        key: 'databrowser/filter_delay',
        label: 'Filter delay',
        min: 0,
        max: 5000,
        suffix: 'ms',
      },
    ],
  },
  {
    id: 'editor',
    title: 'SQL editor',
    icon: CodeIcon,
    fields: [
      { kind: 'int', key: 'editor/fontsize', label: 'Font size', min: 6, max: 40, suffix: 'pt' },
      { kind: 'int', key: 'editor/tabsize', label: 'Tab size', min: 1, max: 16 },
      { kind: 'bool', key: 'editor/wrap_lines', label: 'Wrap long lines' },
      { kind: 'bool', key: 'editor/auto_completion', label: 'Auto completion' },
      { kind: 'bool', key: 'editor/upper_keywords', label: 'Upper case keywords in completion' },
      {
        kind: 'choice',
        key: 'editor/identifier_quotes',
        label: 'Identifier quotes',
        choices: [
          { label: '"Double quotes" (SQL standard)', value: 0 },
          { label: '`Grave accents` (MySQL)', value: 1 },
          { label: '[Square brackets] (MS SQL)', value: 2 },
        ],
      },
    ],
  },
  {
    id: 'mcp',
    title: 'Claude Code (MCP)',
    icon: PlugIcon,
    note: 'Lets Claude Code read and change the open database and drive this window. It only listens on this computer. Changes apply when you save.',
    fields: [
      { kind: 'bool', key: 'MCP/enabled', label: 'Let Claude Code control SQliteView' },
      { kind: 'int', key: 'MCP/port', label: 'Port', min: 1024, max: 65535 },
      { kind: 'mcpConnection', key: 'MCP/enabled', label: 'Connection' },
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    icon: PuzzleIcon,
    note: 'Extensions load when a database opens.',
    fields: [
      { kind: 'bool', key: 'extensions/disableregex', label: 'Disable the built-in REGEXP function' },
      { kind: 'extensions', key: 'extensions/list', label: 'Load on open' },
    ],
  },
]

/** Settings the dialog edits (and Save writes); the MCP connection control acts on its own. */
export const PREFERENCE_KEYS: SettingKey[] = PREFERENCE_PAGES.flatMap((p) =>
  p.fields.filter((f) => f.kind !== 'mcpConnection').map((f) => f.key),
)
