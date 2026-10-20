import { ipcRenderer } from 'electron'
import { appChannels, appEvents, type AppApi } from '@shared/ipc/app'
import { subscribe } from './subscribe'

export const appApi: AppApi = {
  getInfo: () => ipcRenderer.invoke(appChannels.getInfo),
  setUnsavedDocuments: (req) => ipcRenderer.invoke(appChannels.setUnsavedDocuments, req),
  takeStartupRequest: () => ipcRenderer.invoke(appChannels.takeStartupRequest),
  quit: () => ipcRenderer.invoke(appChannels.quit),
  onOpenRequest: (listener) => subscribe(appEvents.openRequest, listener),
}
