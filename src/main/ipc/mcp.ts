import { app, clipboard, type BrowserWindow } from 'electron'
import { mcpChannels, mcpSchemas } from '@shared/ipc/mcp'
import { createMcpService, type McpService } from '../mcp/service'
import { createMcpToken } from '../mcp/token'
import type { SecretValueStore } from '../prefs/secretValues'
import type { SettingsStore } from '../prefs/settings'
import type { DbWorker } from '../worker/rpc'
import type { DbStateTracker } from './db'
import { handle } from './handle'

export interface McpIpcDeps {
  settings: SettingsStore
  secretValues: SecretValueStore
  worker: DbWorker
  dbState: DbStateTracker
  getWindow: () => BrowserWindow | null
}

/** Registers the mcp area; returns the service so main can start and stop the server. */
export function registerMcpIpc(deps: McpIpcDeps): McpService {
  const service = createMcpService({
    ...deps,
    token: createMcpToken(deps.secretValues),
    version: app.getVersion(),
  })

  handle(mcpChannels.status, mcpSchemas.status, () => service.status())
  handle(mcpChannels.copyCommand, mcpSchemas.copyCommand, () => clipboard.writeText(service.connectCommand()))
  handle(mcpChannels.regenerateToken, mcpSchemas.regenerateToken, () => service.regenerateToken())
  // A late reply (after a timeout) has nothing left to settle.
  handle(mcpChannels.reply, mcpSchemas.reply, (reply) => void service.bridge.settle(reply))
  handle(mcpChannels.reportUi, mcpSchemas.reportUi, (snapshot) => service.bridge.setSnapshot(snapshot))

  return service
}
