import { sqlChannels, sqlSchemas } from '@shared/ipc/sql'
import type { DbWorker } from '../worker/rpc'
import { handle } from './handle'

export function registerSqlIpc(worker: DbWorker): void {
  handle(sqlChannels.execute, sqlSchemas.execute, (req) => worker.call('sql.execute', req))
  handle(sqlChannels.count, sqlSchemas.count, (req) => worker.call('sql.count', req))
  handle(sqlChannels.page, sqlSchemas.page, (req) => worker.call('sql.page', req))
}
