import { randomUUID } from 'node:crypto'
import type { UiAction, UiReply, UiRequest, UiSnapshot } from '@shared/types/mcp'

/** How long the window gets to act; opening a database may wait on the user's Save/Discard answer. */
export const UI_TIMEOUT_MS = 30_000
export const UI_OPEN_TIMEOUT_MS = 10 * 60_000

/** Lets MCP tools ask the window to act and wait for its answer (main → renderer → main). */
export interface UiBridge {
  request(action: UiAction): Promise<void>
  /** Settles the request a reply answers; false when it is no longer waiting. */
  settle(reply: UiReply): boolean
  setSnapshot(snapshot: UiSnapshot): void
  snapshot(): UiSnapshot | null
}

/** `send` delivers a request to the window; false when there is no window. */
export function createUiBridge(
  send: (request: UiRequest) => boolean,
  timeouts = { default: UI_TIMEOUT_MS, openDatabase: UI_OPEN_TIMEOUT_MS },
): UiBridge {
  const pending = new Map<string, (reply: UiReply | null) => void>()
  let latest: UiSnapshot | null = null

  return {
    request(action) {
      // The window reports its tabs once it is ready (after the first-run setup).
      if (!latest)
        return Promise.reject(new Error('SQliteView is not ready yet. Finish the first-run setup.'))
      const requestId = randomUUID()
      return new Promise<void>((resolve, reject) => {
        const ms = action.kind === 'openDatabase' ? timeouts.openDatabase : timeouts.default
        const timer = setTimeout(() => settle(null), ms)
        const settle = (reply: UiReply | null): void => {
          clearTimeout(timer)
          pending.delete(requestId)
          if (!reply) reject(new Error('SQliteView did not answer in time.'))
          else if (reply.ok) resolve()
          else reject(new Error(reply.message))
        }
        pending.set(requestId, settle)
        if (!send({ requestId, action }))
          settle({ requestId, ok: false, message: 'SQliteView has no window open.' })
      })
    },
    settle(reply) {
      const settle = pending.get(reply.requestId)
      settle?.(reply)
      return settle !== undefined
    },
    setSnapshot(snapshot) {
      latest = snapshot
    },
    snapshot: () => latest,
  }
}
