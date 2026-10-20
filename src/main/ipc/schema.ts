import { schemaChannels, schemaSchemas } from '@shared/ipc/schema'
import type { DbWorker } from '../worker/rpc'
import { handle } from './handle'

export function registerSchemaIpc(worker: DbWorker): void {
  const c = schemaChannels
  const s = schemaSchemas
  handle(c.tableDefinition, s.tableDefinition, (ref) => worker.call('schema.tableDefinition', ref))
  handle(c.saveTable, s.saveTable, (req) => worker.call('schema.saveTable', req))
  handle(c.createIndex, s.createIndex, (req) => worker.call('schema.createIndex', req))
  handle(c.drop, s.drop, (req) => worker.call('schema.drop', req))
  handle(c.info, s.info, () => worker.call('schema.info'))
  handle(c.setPragmas, s.setPragmas, (req) => worker.call('schema.setPragmas', req))
}
