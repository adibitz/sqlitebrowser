import { ipcRenderer } from 'electron'
import { dbChannels, dbEvents, type DbApi } from '@shared/ipc/db'
import { subscribe } from './subscribe'

export const dbApi: DbApi = {
  sqliteVersion: () => ipcRenderer.invoke(dbChannels.sqliteVersion),
  getState: () => ipcRenderer.invoke(dbChannels.getState),
  open: (req) => ipcRenderer.invoke(dbChannels.open, req),
  create: (req) => ipcRenderer.invoke(dbChannels.create, req),
  openMemory: () => ipcRenderer.invoke(dbChannels.openMemory),
  close: () => ipcRenderer.invoke(dbChannels.close),
  write: () => ipcRenderer.invoke(dbChannels.write),
  revert: () => ipcRenderer.invoke(dbChannels.revert),
  saveAs: (req) => ipcRenderer.invoke(dbChannels.saveAs, req),
  attach: (req) => ipcRenderer.invoke(dbChannels.attach, req),
  detach: (req) => ipcRenderer.invoke(dbChannels.detach, req),
  refreshSchema: () => ipcRenderer.invoke(dbChannels.refreshSchema),
  onState: (listener) => subscribe(dbEvents.state, listener),
  onLog: (listener) => subscribe(dbEvents.log, listener),
  onWarning: (listener) => subscribe(dbEvents.warning, listener),
  onDataChanged: (listener) => subscribe(dbEvents.dataChanged, listener),
}
