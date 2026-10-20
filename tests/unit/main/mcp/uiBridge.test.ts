import { describe, expect, it } from 'vitest'
import type { UiRequest } from '@shared/types/mcp'
import { createUiBridge } from '../../../../src/main/mcp/uiBridge'

const ready = { tabs: [], activeTabId: null }
const openSql = { kind: 'openSql' as const, sql: 'SELECT 1', run: false }

function setup(timeouts = { default: 1000, openDatabase: 1000 }) {
  const sent: UiRequest[] = []
  const bridge = createUiBridge((request) => (sent.push(request), true), timeouts)
  bridge.setSnapshot(ready)
  return { bridge, sent }
}

describe('UI bridge', () => {
  it('resolves when the window answers ok, and rejects with its message otherwise', async () => {
    const { bridge, sent } = setup()
    const done = bridge.request(openSql)
    expect(bridge.settle({ requestId: sent[0]!.requestId, ok: true })).toBe(true)
    await expect(done).resolves.toBeUndefined()

    const failed = bridge.request(openSql)
    bridge.settle({ requestId: sent[1]!.requestId, ok: false, message: 'No such table' })
    await expect(failed).rejects.toThrow('No such table')
    expect(bridge.settle({ requestId: sent[1]!.requestId, ok: true })).toBe(false)
  })

  it('times out when the window does not answer', async () => {
    const { bridge } = setup({ default: 5, openDatabase: 5 })
    await expect(bridge.request(openSql)).rejects.toThrow('did not answer in time')
  })

  it('fails at once before the window is ready, or without a window', async () => {
    const notReady = createUiBridge(() => true)
    await expect(notReady.request(openSql)).rejects.toThrow('not ready')
    const noWindow = createUiBridge(() => false)
    noWindow.setSnapshot(ready)
    await expect(noWindow.request(openSql)).rejects.toThrow('no window open')
  })
})
