import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLOSED_DB_STATE } from '@shared/types/db'
import { createMcpService } from '../../../../src/main/mcp/service'
import type { SettingsStore } from '../../../../src/main/prefs/settings'
import type { DbWorker } from '../../../../src/main/worker/rpc'

/** Settings that throw once closed, like the real store after app.db is closed on quit. */
function closableSettings(values: Record<string, unknown>) {
  let closed = false
  const settings = {
    get: (key: string) => {
      if (closed) throw new TypeError('The database connection is not open')
      return values[key]
    },
  } as unknown as SettingsStore
  return { settings, close: () => void (closed = true) }
}

function service(settings: SettingsStore) {
  return createMcpService({
    settings,
    token: { get: () => 'token', regenerate: () => 'token' },
    worker: {} as DbWorker,
    dbState: { get: () => CLOSED_DB_STATE },
    getWindow: () => null,
    version: '1.0.0',
  })
}

afterEach(() => vi.restoreAllMocks())

describe('MCP service', () => {
  it('starts when turned on and reports where it runs', async () => {
    const { settings } = closableSettings({ 'MCP/enabled': true, 'MCP/port': 0 })
    const mcp = service(settings)
    await mcp.apply()
    expect(mcp.status()).toEqual({ state: 'running', url: 'http://127.0.0.1:0/mcp' })
    await mcp.stop()
    expect(mcp.status()).toEqual({ state: 'off' })
  })

  it('stops on quit without reading the settings, which are closed by then', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { settings, close } = closableSettings({ 'MCP/enabled': true, 'MCP/port': 0 })
    const mcp = service(settings)
    await mcp.apply()
    const stopped = mcp.stop()
    close()
    await stopped
    expect(errors).not.toHaveBeenCalled()
    expect(mcp.status()).toEqual({ state: 'off' })
  })
})
