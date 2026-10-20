import type { DbWorker } from '../worker/rpc'
import type { McpDatabase } from './tools/index'

/** The database side of the MCP tools: the DB worker, so edits land in the same savepoint as the UI's. */
export function workerDatabase(worker: DbWorker): McpDatabase {
  return {
    listTables: () => worker.call('mcp.listTables'),
    describeTable: (ref) => worker.call('mcp.describeTable', ref),
    sampleRows: (ref, limit) => worker.call('mcp.sampleRows', { table: ref, limit }),
    runQuery: (sql) => worker.call('mcp.runQuery', { sql }),
    runSql: (sql) => worker.call('mcp.runSql', { sql }),
    countRows: (query) => worker.call('rows.count', query),
    write: () => worker.call('db.write'),
    revert: () => worker.call('db.revert'),
  }
}
