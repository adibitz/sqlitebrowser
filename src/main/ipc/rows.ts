import { rowsChannels, rowsSchemas } from '@shared/ipc/rows'
import type { DbWorker } from '../worker/rpc'
import { handle } from './handle'

export function registerRowsIpc(worker: DbWorker): void {
  handle(rowsChannels.count, rowsSchemas.count, (query) => worker.call('rows.count', query))
  handle(rowsChannels.page, rowsSchemas.page, (req) => worker.call('rows.page', req))
  handle(rowsChannels.update, rowsSchemas.update, (req) => worker.call('rows.update', req))
  handle(rowsChannels.add, rowsSchemas.add, (req) => worker.call('rows.add', req))
  handle(rowsChannels.remove, rowsSchemas.remove, (req) => worker.call('rows.remove', req))
  handle(rowsChannels.duplicate, rowsSchemas.duplicate, (req) => worker.call('rows.duplicate', req))
  handle(rowsChannels.validateDisplayFormat, rowsSchemas.validateDisplayFormat, (req) =>
    worker.call('rows.validateDisplayFormat', req),
  )
}
