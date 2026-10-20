// The one engine session of this worker, plus the events it produced during the current request.
import type { LogEntry, LogSource } from '@shared/types/db'
import { createSession, LogMessageType } from '../core/db/session'
import type { WorkerEvent } from './protocol'
import { buildDbState } from './snapshot'

const LOG_SOURCES: Record<LogMessageType, LogSource> = {
  [LogMessageType.User]: 'user',
  [LogMessageType.App]: 'app',
  [LogMessageType.ErrorLog]: 'error',
}

let pendingLogs: LogEntry[] = []
let pendingWarnings: string[] = []
let stateChanged = false

export const session = createSession(
  {},
  {
    log: (sql, type) => pendingLogs.push({ time: Date.now(), sql, source: LOG_SOURCES[type] }),
    dirtyChanged: () => {
      stateChanged = true
    },
    structureUpdated: () => {
      stateChanged = true
    },
    warning: (message) => pendingWarnings.push(message),
  },
)

/** Forces a state event after the current request (open/close change more than the engine reports). */
export function markStateChanged(): void {
  stateChanged = true
}

/** Events collected since the last call: one state snapshot at most, then logs and warnings. */
export function drainEvents(): WorkerEvent[] {
  const events: WorkerEvent[] = []
  if (stateChanged) events.push({ name: 'state', state: buildDbState(session) })
  if (pendingLogs.length) events.push({ name: 'log', entries: pendingLogs })
  for (const message of pendingWarnings) events.push({ name: 'warning', message })
  stateChanged = false
  pendingLogs = []
  pendingWarnings = []
  return events
}
