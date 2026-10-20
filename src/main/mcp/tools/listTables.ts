import { json, type ToolContext } from './context'

/** MCP tool list_tables. */
export function registerListTables(ctx: ToolContext): void {
  ctx.server.registerTool(
    'list_tables',
    {
      description: 'Lists the tables and views of the database open in SQliteView, with their column names.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => ctx.guarded(async () => json(await ctx.db.listTables())),
  )
}
