// Port of reference/sqliteview/ui/db_info_tab.py (PRAGMAS): the pragmas the Database Info tab edits.

export type PragmaEditor =
  | { kind: 'bool' }
  /** Stored as the index of the choice (auto_vacuum, synchronous, temp_store). */
  | { kind: 'enum'; choices: string[] }
  /** Stored as the text of the choice (journal_mode, locking_mode). */
  | { kind: 'text'; choices: string[] }
  | { kind: 'pageSize'; choices: number[] }
  | { kind: 'int'; min: number; max: number }

export interface PragmaDef {
  name: string
  editor: PragmaEditor
  description: string
}

export const JOURNAL_MODE_VALUES = ['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF']
export const LOCKING_MODE_VALUES = ['NORMAL', 'EXCLUSIVE']

const bool = { kind: 'bool' } as const

export const PRAGMAS: PragmaDef[] = [
  {
    name: 'auto_vacuum',
    editor: { kind: 'enum', choices: ['None', 'Full', 'Incremental'] },
    description: 'Reclaim free pages automatically',
  },
  { name: 'automatic_index', editor: bool, description: 'Let the planner create transient indices' },
  { name: 'case_sensitive_like', editor: bool, description: 'LIKE compares case-sensitively' },
  { name: 'checkpoint_fullfsync', editor: bool, description: 'F_FULLFSYNC during checkpoints (macOS)' },
  { name: 'foreign_keys', editor: bool, description: 'Enforce foreign key constraints' },
  { name: 'fullfsync', editor: bool, description: 'F_FULLFSYNC on commit (macOS)' },
  { name: 'ignore_check_constraints', editor: bool, description: 'Skip CHECK constraints' },
  {
    name: 'journal_mode',
    editor: { kind: 'text', choices: JOURNAL_MODE_VALUES },
    description: 'Rollback journal mode',
  },
  {
    name: 'journal_size_limit',
    editor: { kind: 'int', min: -1, max: 2_147_483_647 },
    description: 'Max journal size after a transaction (bytes, -1 = none)',
  },
  {
    name: 'locking_mode',
    editor: { kind: 'text', choices: LOCKING_MODE_VALUES },
    description: 'Database locking mode',
  },
  {
    name: 'max_page_count',
    editor: { kind: 'int', min: 1, max: 4_294_967_294 },
    description: 'Maximum number of pages',
  },
  {
    name: 'page_size',
    editor: { kind: 'pageSize', choices: [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536] },
    description: 'Page size in bytes (applies after VACUUM)',
  },
  { name: 'recursive_triggers', editor: bool, description: 'Allow triggers to fire recursively' },
  { name: 'secure_delete', editor: bool, description: 'Overwrite deleted content with zeros' },
  {
    name: 'synchronous',
    editor: { kind: 'enum', choices: ['Off', 'Normal', 'Full', 'Extra'] },
    description: 'Disk synchronisation level',
  },
  {
    name: 'temp_store',
    editor: { kind: 'enum', choices: ['Default', 'File', 'Memory'] },
    description: 'Where temporary tables are stored',
  },
  {
    name: 'user_version',
    editor: { kind: 'int', min: -2_147_483_648, max: 2_147_483_647 },
    description: 'Application defined version number',
  },
  {
    name: 'wal_autocheckpoint',
    editor: { kind: 'int', min: 0, max: 2_147_483_647 },
    description: 'WAL auto-checkpoint interval (pages)',
  },
]

export const PRAGMA_NAMES = PRAGMAS.map((p) => p.name)

/** A pragma value as the form shows it: booleans and enums as numbers, modes as upper-case text. */
export type PragmaValue = number | string

export function normalizePragmaValue(def: PragmaDef, raw: unknown): PragmaValue {
  if (def.editor.kind === 'text') return String(raw ?? '').toUpperCase()
  const n = Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Pragmas whose value differs from `before` (compared like upstream: as upper-case text). */
export function changedPragmas(
  before: Record<string, PragmaValue>,
  after: Record<string, PragmaValue>,
): Record<string, PragmaValue> {
  return Object.fromEntries(
    Object.entries(after).filter(
      ([name, value]) => String(value).toUpperCase() !== String(before[name] ?? '').toUpperCase(),
    ),
  )
}
