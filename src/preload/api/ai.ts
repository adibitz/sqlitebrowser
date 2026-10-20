import { ipcRenderer } from 'electron'
import { aiChannels, aiEvents, type AiApi } from '@shared/ipc/ai'
import { subscribe } from './subscribe'

export const aiApi: AiApi = {
  listProviders: () => ipcRenderer.invoke(aiChannels.listProviders),
  saveProvider: (req) => ipcRenderer.invoke(aiChannels.saveProvider, req),
  deleteProvider: (req) => ipcRenderer.invoke(aiChannels.deleteProvider, req),
  canEncryptKeys: () => ipcRenderer.invoke(aiChannels.canEncryptKeys),
  listModels: (req) => ipcRenderer.invoke(aiChannels.listModels, req),
  send: (req) => ipcRenderer.invoke(aiChannels.send, req),
  stop: (req) => ipcRenderer.invoke(aiChannels.stop, req),
  approve: (req) => ipcRenderer.invoke(aiChannels.approve, req),
  history: () => ipcRenderer.invoke(aiChannels.history),
  clearHistory: () => ipcRenderer.invoke(aiChannels.clearHistory),
  onChat: (listener) => subscribe(aiEvents.chat, listener),
}
