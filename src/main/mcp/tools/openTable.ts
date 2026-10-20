import { z } from 'zod'
import { json, tableInput, type ToolContext } from './context'

/** MCP tool open_table. */
export function registerOpenTable(ctx: ToolContext): void {
  ctx.server.registerTool(
    'open_table',
    {
      description:
        'Shows a table or view in SQliteView with the given filters, search and sort, replacing those of its tab ' +
        'if it is already open. Returns how many rows match.',
      inputSchema: {
        ...tableInput,
        filters: z
          .record(z.string().max(512), z.string().max(1000))
          .optional()
          .describe(
            'Column name to filter text, as typed in the filter row: "abc" (contains), "=IN", ">100", "<>0", ' +
              '"=NULL", "<>NULL", "1~10" (between), "/^a.*/" (regexp)',
          ),
        search: z.string().max(1000).optional().describe('Words to find in any column'),
        sort: z
          .array(z.object({ column: z.string().max(512), direction: z.enum(['asc', 'desc']) }))
          .max(20)
          .optional(),
      },
    },
    ({ table, schema, filters = {}, search = '', sort = [] }) =>
      ctx.guarded(async () => {
        ctx.requireOpen()
        const ref = await ctx.resolve(table, schema)
        // Counting first checks the table, its columns and the filters before the window changes.
        const matchingRows = await ctx.db.countRows({
          table: ref,
          filters,
          globalFilter: search,
          sort,
          pseudoPk: [],
          filterEscape: ctx.host.filterEscape(),
          displayFormats: {},
          condFormats: [],
        })
        await ctx.host.ui({ kind: 'openTable', table: ref, filters, search, sort })
        return json({ table: ref, matchingRows })
      }),
  )
}
