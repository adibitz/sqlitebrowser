import { ipcRenderer } from 'electron'
import { mcpChannels, mcpEvents, type McpApi } from '@shared/ipc/mcp'
import { subscribe } from './subscribe'

export const mcpApi: McpApi = {
  status: () => ipcRenderer.invoke(mcpChannels.status),
  copyCommand: () => ipcRenderer.invoke(mcpChannels.copyCommand),
  regenerateToken: () => ipcRenderer.invoke(mcpChannels.regenerateToken),
  reply: (reply) => ipcRenderer.invoke(mcpChannels.reply, reply),
  reportUi: (snapshot) => ipcRenderer.invoke(mcpChannels.reportUi, snapshot),
  onStatus: (listener) => subscribe(mcpEvents.statusChanged, listener),
  onUiRequest: (listener) => subscribe(mcpEvents.uiRequest, listener),
}
