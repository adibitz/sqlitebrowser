import { z } from 'zod'
import { json, type ToolContext } from './context'

/** MCP tool open_sql_editor. */
export function registerOpenSqlEditor(ctx: ToolContext): void {
  ctx.server.registerTool(
    'open_sql_editor',
    {
      description:
        'Opens a new SQL editor tab in SQliteView with the given SQL, and runs it there when run is true, so the ' +
        'user sees the statements and their results. Use it to show rows open_table filters cannot select (OR ' +
        'across values, joins, totals). To read rows yourself, use run_query.',
      inputSchema: {
        sql: z.string().min(1).max(1_000_000),
        run: z.boolean().optional().describe('Execute all statements in the editor (default false)'),
      },
    },
    ({ sql, run = false }) =>
      ctx.guarded(async () => {
        if (run) ctx.requireOpen()
        await ctx.host.ui({ kind: 'openSql', sql, run })
        return json({ opened: true, ran: run })
      }),
  )
}
