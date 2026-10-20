import { ipcRenderer } from 'electron'
import { rowsChannels, type RowsApi } from '@shared/ipc/rows'

export const rowsApi: RowsApi = {
  count: (query) => ipcRenderer.invoke(rowsChannels.count, query),
  page: (req) => ipcRenderer.invoke(rowsChannels.page, req),
  update: (req) => ipcRenderer.invoke(rowsChannels.update, req),
  add: (req) => ipcRenderer.invoke(rowsChannels.add, req),
  remove: (req) => ipcRenderer.invoke(rowsChannels.remove, req),
  duplicate: (req) => ipcRenderer.invoke(rowsChannels.duplicate, req),
  validateDisplayFormat: (req) => ipcRenderer.invoke(rowsChannels.validateDisplayFormat, req),
}
