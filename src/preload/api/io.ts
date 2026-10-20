import { ipcRenderer } from 'electron'
import { ioChannels, type IoApi } from '@shared/ipc/io'

export const ioApi: IoApi = {
  chooseCsvFiles: () => ipcRenderer.invoke(ioChannels.chooseCsvFiles),
  previewCsv: (req) => ipcRenderer.invoke(ioChannels.previewCsv, req),
  importCsv: (req) => ipcRenderer.invoke(ioChannels.importCsv, req),
  exportData: (req) => ipcRenderer.invoke(ioChannels.exportData, req),
  exportSql: (req) => ipcRenderer.invoke(ioChannels.exportSql, req),
  chooseSqlFile: () => ipcRenderer.invoke(ioChannels.chooseSqlFile),
  importSql: (req) => ipcRenderer.invoke(ioChannels.importSql, req),
}
