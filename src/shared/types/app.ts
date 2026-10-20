export interface AppInfo {
  version: string
  platform: string
  electron: string
}

/** What to open at start or when another launch hands over its arguments (command line). */
export interface StartupRequest {
  /** Absolute path of a database or .sqbpro project. */
  database: string | null
  readOnly: boolean
  /** Table to browse after opening. */
  table: string | null
  /** Absolute path of an SQL file to open and run. */
  sql: string | null
  /** Exit after running the SQL file, writing its changes. */
  quit: boolean
}
