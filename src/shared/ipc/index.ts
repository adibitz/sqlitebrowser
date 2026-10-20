import type { AppApi } from './app'
import type { DbApi } from './db'
import type { FilesApi } from './files'
import type { IoApi } from './io'
import type { McpApi } from './mcp'
import type { PrefsApi } from './prefs'
import type { ProjectApi } from './project'
import type { RowsApi } from './rows'
import type { SchemaApi } from './schema'
import type { SqlApi } from './sql'

/** Everything the preload script exposes as `window.api`, one key per IPC area. */
export interface WindowApi {
  app: AppApi
  prefs: PrefsApi
  files: FilesApi
  db: DbApi
  rows: RowsApi
  sql: SqlApi
  schema: SchemaApi
  io: IoApi
  project: ProjectApi
  mcp: McpApi
}
