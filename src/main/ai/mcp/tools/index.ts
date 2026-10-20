// The MCP tools the model uses on the open database, one per file. Each is a thin wrapper over the DB
// worker; reads run at once, writes wait for the user to approve the exact SQL.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createToolContext, type AiDatabase, type ToolHooks } from './context'
import { registerDescribeTable } from './describeTable'
import { registerListTables } from './listTables'
import { registerRunQuery } from './runQuery'
import { registerRunSql } from './runSql'
import { registerSampleRows } from './sampleRows'

export type { AiDatabase, ToolHooks } from './context'

export function registerDatabaseTools(server: McpServer, db: AiDatabase, hooks: ToolHooks): void {
  const ctx = createToolContext(server, db, hooks)
  registerListTables(ctx)
  registerDescribeTable(ctx)
  registerSampleRows(ctx)
  registerRunQuery(ctx)
  registerRunSql(ctx)
}
