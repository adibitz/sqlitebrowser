import { z } from 'zod'
import { json, rowsText, tableInput, type ToolContext } from './context'

/** MCP tool sample_rows. */
export function registerSampleRows(ctx: ToolContext): void {
  ctx.server.registerTool(
    'sample_rows',
    {
      description: 'The first rows of a table or view, to see what its data looks like.',
      inputSchema: {
        ...tableInput,
        limit: z.number().int().min(1).max(200).optional().describe('Rows, default 10'),
      },
    },
    ({ table, schema, limit }) =>
      ctx.guarded(`Couldn't read ${table}`, async () => {
        const ref = await ctx.resolve(table, schema)
        const rows = await ctx.db.sampleRows(ref, limit ?? 10)
        ctx.hooks.report({
          status: 'done',
          summary: `Read ${rowsText(rows)} of ${ref.name}`,
          table: { columns: rows.columns, rows: rows.rows, total: rows.total },
        })
        return json(rows)
      }),
  )
}
