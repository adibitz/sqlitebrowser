import { ipcRenderer } from 'electron'
import { schemaChannels, type SchemaApi } from '@shared/ipc/schema'

export const schemaApi: SchemaApi = {
  tableDefinition: (ref) => ipcRenderer.invoke(schemaChannels.tableDefinition, ref),
  saveTable: (req) => ipcRenderer.invoke(schemaChannels.saveTable, req),
  createIndex: (req) => ipcRenderer.invoke(schemaChannels.createIndex, req),
  drop: (req) => ipcRenderer.invoke(schemaChannels.drop, req),
  info: () => ipcRenderer.invoke(schemaChannels.info),
  setPragmas: (req) => ipcRenderer.invoke(schemaChannels.setPragmas, req),
}
