import { json, plural, tableInput, type ToolContext } from './context'

/** MCP tool describe_table. */
export function registerDescribeTable(ctx: ToolContext): void {
  ctx.server.registerTool(
    'describe_table',
    {
      description:
        'Columns (types, keys, defaults, references), indices, row count and CREATE statement of a table or view.',
      inputSchema: tableInput,
    },
    ({ table, schema }) =>
      ctx.guarded(`Couldn't describe ${table}`, async () => {
        const info = await ctx.db.describeTable(await ctx.resolve(table, schema))
        ctx.hooks.report({
          status: 'done',
          summary: `Described ${info.name} · ${plural(info.rowCount, 'row')}`,
          sql: info.sql,
        })
        return json(info)
      }),
  )
}
