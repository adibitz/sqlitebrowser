import { json, plural, type ToolContext } from './context'

/** MCP tool list_tables. */
export function registerListTables(ctx: ToolContext): void {
  ctx.server.registerTool(
    'list_tables',
    {
      description: 'Lists the tables and views of the open SQLite database, with their column names.',
      inputSchema: {},
    },
    () =>
      ctx.guarded("Couldn't list the tables", async () => {
        const tables = await ctx.db.listTables()
        ctx.hooks.report({ status: 'done', summary: `Listed ${plural(tables.length, 'table')}` })
        return json(tables)
      }),
  )
}
