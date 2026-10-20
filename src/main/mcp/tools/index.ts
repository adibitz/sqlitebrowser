// The MCP tools, one per file. Each is a thin wrapper over the DB worker or the window: reads and
// edits run at once (edits stay uncommitted), writing to disk asks the user first.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createToolContext, type McpDatabase, type McpHost } from './context'
import { registerDescribeTable } from './describeTable'
import { registerGetAppState } from './getAppState'
import { registerListTables } from './listTables'
import { registerOpenDatabase } from './openDatabase'
import { registerOpenSqlEditor } from './openSqlEditor'
import { registerOpenTable } from './openTable'
import { registerRevertChanges } from './revertChanges'
import { registerRunQuery } from './runQuery'
import { registerRunSql } from './runSql'
import { registerSampleRows } from './sampleRows'
import { registerWriteChanges } from './writeChanges'

export type { McpDatabase, McpHost } from './context'

export function registerTools(server: McpServer, db: McpDatabase, host: McpHost): void {
  const ctx = createToolContext(server, db, host)
  registerGetAppState(ctx)
  registerListTables(ctx)
  registerDescribeTable(ctx)
  registerSampleRows(ctx)
  registerRunQuery(ctx)
  registerRunSql(ctx)
  registerRevertChanges(ctx)
  registerWriteChanges(ctx)
  registerOpenDatabase(ctx)
  registerOpenTable(ctx)
  registerOpenSqlEditor(ctx)
}
