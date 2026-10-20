import type { DbState, LogEntry } from '@shared/types/db'

/** Messages between main and the DB worker. */
export interface WorkerRequest {
  id: number
  method: string
  args: unknown
}

export type WorkerEvent =
  | { name: 'state'; state: DbState }
  | { name: 'log'; entries: LogEntry[] }
  | { name: 'warning'; message: string }

export type WorkerMessage =
  | { type: 'response'; id: number; ok: true; result: unknown }
  | { type: 'response'; id: number; ok: false; error: { name: string; message: string } }
  | { type: 'event'; event: WorkerEvent }
