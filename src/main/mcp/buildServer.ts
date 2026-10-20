import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTools, type McpDatabase, type McpHost } from './tools/index'

const INSTRUCTIONS =
  'SQliteView is a desktop SQLite browser the user has open. The tools work on the database open in it and ' +
  'show things in its window. Call get_app_state first. Changes made with run_sql stay uncommitted (the user ' +
  'sees them and can revert) until write_changes, which asks the user.'

/** One MCP server with every tool; the HTTP endpoint makes one per request. */
export function buildMcpServer(db: McpDatabase, host: McpHost, version: string): McpServer {
  const server = new McpServer({ name: 'sqliteview', version }, { instructions: INSTRUCTIONS })
  registerTools(server, db, host)
  return server
}
