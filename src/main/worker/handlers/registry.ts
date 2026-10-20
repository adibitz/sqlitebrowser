import { aiHandlers } from './ai'
import { dbHandlers } from './db'
import { ioHandlers } from './io'
import { rowsHandlers } from './rows'
import { schemaHandlers } from './schema'
import { sqlHandlers } from './sql'

/** Every method the worker answers, keyed '<area>.<method>'. Each area adds its handlers here. */
export const handlers = {
  ...aiHandlers,
  ...dbHandlers,
  ...ioHandlers,
  ...rowsHandlers,
  ...schemaHandlers,
  ...sqlHandlers,
}

export type WorkerHandlers = typeof handlers
export type WorkerMethod = keyof WorkerHandlers
