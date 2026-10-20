// Writes the model asks for wait here until the user approves or denies them in the panel.
import { randomUUID } from 'node:crypto'

/** A change nobody answers is refused after this long. */
export const APPROVAL_TIMEOUT_MS = 10 * 60_000

export interface Approvals {
  /** Shows the request (via `announce`) and resolves with the user's answer; false on stop or timeout. */
  request(sql: string, signal: AbortSignal, announce: (approvalId: string) => void): Promise<boolean>
  /** The user's answer; false when there is no such request any more. */
  settle(approvalId: string, approved: boolean): boolean
}

export function createApprovals(
  onSettled: (approvalId: string, approved: boolean) => void,
  timeoutMs = APPROVAL_TIMEOUT_MS,
): Approvals {
  const pending = new Map<string, (approved: boolean) => void>()

  const settle = (approvalId: string, approved: boolean): boolean => {
    const resolve = pending.get(approvalId)
    if (!resolve) return false
    pending.delete(approvalId)
    onSettled(approvalId, approved)
    resolve(approved)
    return true
  }

  return {
    request(_sql, signal, announce) {
      const id = randomUUID()
      return new Promise<boolean>((resolve) => {
        if (signal.aborted) return resolve(false)
        const timer = setTimeout(() => settle(id, false), timeoutMs)
        const onAbort = (): void => void settle(id, false)
        pending.set(id, (approved) => {
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
          resolve(approved)
        })
        signal.addEventListener('abort', onAbort, { once: true })
        announce(id)
      })
    },
    settle,
  }
}
