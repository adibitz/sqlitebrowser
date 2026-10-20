import { z } from 'zod'
import { json, rowsText, type ToolContext } from './context'

/** MCP tool run_query. */
export function registerRunQuery(ctx: ToolContext): void {
  ctx.server.registerTool(
    'run_query',
    {
      description:
        'Runs one read-only SQLite statement (SELECT, WITH … SELECT, read-only PRAGMA) and returns up to 200 rows. ' +
        'It runs at once; statements that change anything are refused.',
      inputSchema: { sql: z.string().min(1).max(100_000).describe('One SQLite statement that only reads') },
    },
    ({ sql }) =>
      ctx.guarded('Query failed', async () => {
        const rows = await ctx.db.runQuery(sql)
        ctx.hooks.report({
          status: 'done',
          summary: `Ran a query · ${rowsText(rows)}`,
          sql,
          table: { columns: rows.columns, rows: rows.rows, total: rows.total },
        })
        return json(rows)
      }),
  )
}
