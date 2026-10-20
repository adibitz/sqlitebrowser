import { z } from 'zod'
import { json, type ToolContext } from './context'

/** MCP tool run_sql. */
export function registerRunSql(ctx: ToolContext): void {
  ctx.server.registerTool(
    'run_sql',
    {
      description:
        'Changes the database (INSERT, UPDATE, DELETE, CREATE, ALTER, …). The changes stay uncommitted: the user ' +
        'sees them in SQliteView and can revert them. Call write_changes to save them to disk.',
      inputSchema: { sql: z.string().min(1).max(1_000_000).describe('SQLite statements to run') },
      annotations: { destructiveHint: true },
    },
    ({ sql }) =>
      ctx.guarded(async () => {
        const { changes } = await ctx.db.runSql(sql)
        ctx.host.dataChanged()
        return json({ changes, note: 'Uncommitted until write_changes; revert_changes undoes it.' })
      }),
  )
}
