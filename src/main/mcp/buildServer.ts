import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTools, type McpDatabase, type McpHost } from './tools/index'

const INSTRUCTIONS =
  'SQliteView is a desktop SQLite browser the user has open. These tools work on the database open in it and ' +
  'drive its window; no screen control is needed. Call get_app_state first. ' +
  'When the user asks to show, list, find, filter or sort rows, show them in the window: open_table with ' +
  'filters, search and sort for one table, or open_sql_editor with run true when that needs OR across values, ' +
  'joins or totals. Then answer in a sentence or two. Use run_query and sample_rows to check data or answer a ' +
  'question, not instead of showing it. Changes made with run_sql stay uncommitted (the user sees them and can ' +
  'revert) until write_changes, which asks the user.'

/** One MCP server with every tool; the HTTP endpoint makes one per request. */
export function buildMcpServer(db: McpDatabase, host: McpHost, version: string): McpServer {
  const server = new McpServer({ name: 'sqliteview', version }, { instructions: INSTRUCTIONS })
  registerTools(server, db, host)
  return server
}
