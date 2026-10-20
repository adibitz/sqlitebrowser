import type { SchemaInfo } from './schema'

export const MEMORY_DATABASE = ':memory:'

/** Everything the UI needs to know about the open database. */
export interface DbState {
  isOpen: boolean
  /** File path, or ':memory:'. '' when nothing is open. */
  path: string
  readOnly: boolean
  /** True while there are uncommitted changes (savepoints). */
  dirty: boolean
  /** PRAGMA encoding, e.g. 'UTF-8'. */
  encoding: string
  schemata: SchemaInfo[]
}

export const CLOSED_DB_STATE: DbState = {
  isOpen: false,
  path: '',
  readOnly: false,
  dirty: false,
  encoding: '',
  schemata: [],
}

export type LogSource = 'user' | 'app' | 'error'

export interface LogEntry {
  /** ms since epoch */
  time: number
  sql: string
  source: LogSource
}
