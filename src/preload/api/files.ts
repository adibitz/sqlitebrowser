import { ipcRenderer, webUtils } from 'electron'
import { filesChannels, type FilesApi } from '@shared/ipc/files'

export const filesApi: FilesApi = {
  showOpenDatabase: (req) => ipcRenderer.invoke(filesChannels.showOpenDatabase, req),
  showSaveDatabase: (req) => ipcRenderer.invoke(filesChannels.showSaveDatabase, req),
  recent: () => ipcRenderer.invoke(filesChannels.recent),
  clearRecent: () => ipcRenderer.invoke(filesChannels.clearRecent),
  revealInFolder: (req) => ipcRenderer.invoke(filesChannels.revealInFolder, req),
  saveText: (req) => ipcRenderer.invoke(filesChannels.saveText, req),
  openBinary: (req) => ipcRenderer.invoke(filesChannels.openBinary, req),
  saveBinary: (req) => ipcRenderer.invoke(filesChannels.saveBinary, req),
  openText: (req) => ipcRenderer.invoke(filesChannels.openText, req),
  writeText: (req) => ipcRenderer.invoke(filesChannels.writeText, req),
  openTextAt: (req) => ipcRenderer.invoke(filesChannels.openTextAt, req),
  chooseFolder: (req) => ipcRenderer.invoke(filesChannels.chooseFolder, req),
  chooseExtension: () => ipcRenderer.invoke(filesChannels.chooseExtension),
  pathForFile: (file) => webUtils.getPathForFile(file),
}
