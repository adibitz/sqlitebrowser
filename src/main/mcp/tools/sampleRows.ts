import { z } from 'zod'
import { json, tableInput, type ToolContext } from './context'

/** MCP tool sample_rows. */
export function registerSampleRows(ctx: ToolContext): void {
  ctx.server.registerTool(
    'sample_rows',
    {
      description:
        'The first rows of a table or view, for you to see what its data looks like. To show rows to the user, ' +
        'use open_table.',
      inputSchema: {
        ...tableInput,
        limit: z.number().int().min(1).max(200).optional().describe('Rows, default 10'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ table, schema, limit = 10 }) =>
      ctx.guarded(async () => json(await ctx.db.sampleRows(await ctx.resolve(table, schema), limit))),
  )
}
