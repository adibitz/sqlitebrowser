import { contextBridge } from 'electron'
import type { WindowApi } from '@shared/ipc'
import { appApi } from './api/app'
import { dbApi } from './api/db'
import { filesApi } from './api/files'
import { ioApi } from './api/io'
import { mcpApi } from './api/mcp'
import { prefsApi } from './api/prefs'
import { projectApi } from './api/project'
import { rowsApi } from './api/rows'
import { schemaApi } from './api/schema'
import { sqlApi } from './api/sql'

const api: WindowApi = {
  app: appApi,
  prefs: prefsApi,
  files: filesApi,
  db: dbApi,
  rows: rowsApi,
  sql: sqlApi,
  schema: schemaApi,
  io: ioApi,
  project: projectApi,
  mcp: mcpApi,
}

contextBridge.exposeInMainWorld('api', api)
