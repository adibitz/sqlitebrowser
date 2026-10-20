import { json, tableInput, type ToolContext } from './context'

/** MCP tool describe_table. */
export function registerDescribeTable(ctx: ToolContext): void {
  ctx.server.registerTool(
    'describe_table',
    {
      description:
        'Columns (types, keys, defaults, references), indices, row count and CREATE statement of a table or view.',
      inputSchema: tableInput,
      annotations: { readOnlyHint: true },
    },
    ({ table, schema }) =>
      ctx.guarded(async () => json(await ctx.db.describeTable(await ctx.resolve(table, schema)))),
  )
}
