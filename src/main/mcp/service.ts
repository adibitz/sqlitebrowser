import type { BrowserWindow } from 'electron'
import { dbEvents } from '@shared/ipc/db'
import { mcpEvents } from '@shared/ipc/mcp'
import type { McpStatus } from '@shared/types/mcp'
import { UserError } from '../errors'
import type { DbStateTracker } from '../ipc/db'
import type { SettingsStore } from '../prefs/settings'
import type { DbWorker } from '../worker/rpc'
import { buildMcpServer } from './buildServer'
import { confirmWrite } from './confirmWrite'
import { claudeAddCommand, mcpUrl } from './connectCommand'
import { startMcpHttp, type McpHttpServer } from './httpServer'
import type { McpToken } from './token'
import type { McpHost } from './tools/index'
import { createUiBridge, type UiBridge } from './uiBridge'
import { workerDatabase } from './workerDatabase'

export interface McpServiceDeps {
  settings: SettingsStore
  token: McpToken
  worker: DbWorker
  dbState: DbStateTracker
  getWindow: () => BrowserWindow | null
  version: string
}

/** The MCP server as the app runs it: started, moved and stopped to follow the settings. */
export interface McpService {
  status(): McpStatus
  /** Starts, stops or moves the server to match 'MCP/enabled' and 'MCP/port'. */
  apply(): Promise<void>
  stop(): Promise<void>
  /** The `claude mcp add` command for the running server. */
  connectCommand(): string
  regenerateToken(): void
  bridge: UiBridge
}

function startError(err: unknown, port: number): string {
  if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE')
    return `Port ${port} is in use by another program. Pick another port.`
  return `The MCP server didn't start: ${(err as Error).message}`
}

export function createMcpService({
  settings,
  token,
  worker,
  dbState,
  getWindow,
  version,
}: McpServiceDeps): McpService {
  const window = (): BrowserWindow | null => {
    const win = getWindow()
    return win && !win.isDestroyed() ? win : null
  }
  const bridge = createUiBridge((request) => {
    const win = window()
    win?.webContents.send(mcpEvents.uiRequest, request)
    return win !== null
  })
  const host: McpHost = {
    dbState: () => dbState.get(),
    uiSnapshot: () => bridge.snapshot(),
    ui: (action) => bridge.request(action),
    confirmWrite: () => confirmWrite(window()),
    dataChanged: () => window()?.webContents.send(dbEvents.dataChanged),
    filterEscape: () => settings.get('databrowser/filter_escape'),
  }
  const db = workerDatabase(worker)

  let running: { http: McpHttpServer; port: number } | null = null
  let status: McpStatus = { state: 'off' }
  let queue = Promise.resolve()

  const setStatus = (next: McpStatus): void => {
    status = next
    window()?.webContents.send(mcpEvents.statusChanged, next)
  }

  async function reconcile(stopOnly = false): Promise<void> {
    const enabled = !stopOnly && settings.get('MCP/enabled')
    const port = settings.get('MCP/port')
    if (running && (!enabled || running.port !== port)) {
      await running.http.close()
      running = null
    }
    if (!enabled) return setStatus({ state: 'off' })
    if (running) return
    try {
      const http = await startMcpHttp({
        port,
        token: () => token.get(),
        createServer: () => buildMcpServer(db, host, version),
      })
      running = { http, port }
      setStatus({ state: 'running', url: mcpUrl(port) })
    } catch (err) {
      setStatus({ state: 'error', message: startError(err, port) })
    }
  }

  // One change at a time, so quick toggles can't start two servers.
  const enqueue = (stopOnly: boolean): Promise<void> =>
    (queue = queue
      .then(() => reconcile(stopOnly))
      .catch((err: unknown) => console.error('[mcp] server change failed', err)))

  return {
    status: () => status,
    apply: () => enqueue(false),
    stop: () => enqueue(true),
    connectCommand() {
      if (!running) throw new UserError('Turn on the MCP server first.')
      return claudeAddCommand(running.port, token.get())
    },
    regenerateToken() {
      token.regenerate()
    },
    bridge,
  }
}
