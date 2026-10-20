export const MCP_PATH = '/mcp'

export function mcpUrl(port: number): string {
  return `http://127.0.0.1:${port}${MCP_PATH}`
}

/** The command that adds this server to Claude Code for every project of the user. */
export function claudeAddCommand(port: number, token: string): string {
  return `claude mcp add --transport http --scope user sqliteview ${mcpUrl(port)} --header "Authorization: Bearer ${token}"`
}
