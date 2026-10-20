import { ipcRenderer } from 'electron'
import { sqlChannels, type SqlApi } from '@shared/ipc/sql'

export const sqlApi: SqlApi = {
  execute: (req) => ipcRenderer.invoke(sqlChannels.execute, req),
  count: (req) => ipcRenderer.invoke(sqlChannels.count, req),
  page: (req) => ipcRenderer.invoke(sqlChannels.page, req),
}
