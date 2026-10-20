import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { z } from 'zod'
import { UserError } from '../errors'
import { WorkerError } from '../worker/rpc'
import { devServerUrl } from '../window'

const GENERIC_ERROR = 'Something went wrong. Check the log for details.'

/**
 * Registers an invoke handler that only answers our own page, validates its argument with `schema`,
 * and turns unexpected errors into a generic message (details stay in the main-process log).
 */
export function handle<S extends z.ZodType, R>(
  channel: string,
  schema: S,
  fn: (args: z.infer<S>) => R | Promise<R>,
): void {
  ipcMain.handle(channel, async (event, raw: unknown) => {
    if (!isTrustedSender(event)) throw new Error('Request from an unknown page was refused.')
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      console.error(`[ipc] invalid request on ${channel}`, parsed.error.issues)
      throw new Error('The request was not valid.')
    }
    try {
      return await fn(parsed.data)
    } catch (err) {
      // Engine errors (SQLite messages) tell the user what went wrong; anything else stays in the log.
      if (err instanceof UserError || err instanceof WorkerError) throw new Error(err.message, { cause: err })
      console.error(`[ipc] ${channel} failed`, err)
      // The cause is deliberately not attached: internals stay in the main-process log.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(GENERIC_ERROR)
    }
  })
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? ''
  const dev = devServerUrl()
  return url.startsWith('file://') || (dev !== undefined && url.startsWith(dev))
}
