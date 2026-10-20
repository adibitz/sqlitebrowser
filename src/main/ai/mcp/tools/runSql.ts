import { z } from 'zod'
import { failure, json, plural, type ToolContext } from './context'

/** MCP tool run_sql. */
export function registerRunSql(ctx: ToolContext): void {
  ctx.server.registerTool(
    'run_sql',
    {
      description:
        'Changes the database (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP …). The user sees the exact SQL and must ' +
        'approve it first. Changes stay pending until the user writes them to the file, and can be reverted.',
      inputSchema: { sql: z.string().min(1).max(1_000_000).describe('SQLite statements to run') },
    },
    async ({ sql }) => {
      if (!(await ctx.hooks.approve(sql))) {
        ctx.hooks.report({ status: 'denied', summary: 'Change not approved', sql })
        return failure('The user did not approve this change. Nothing was run.')
      }
      return ctx.guarded('Change failed', async () => {
        const { changes } = await ctx.db.runSql(sql)
        ctx.hooks.report({ status: 'done', summary: `Changed the database · ${plural(changes, 'row')}`, sql })
        return json({ changes, note: 'Pending until the user writes changes; they can revert it.' })
      })
    },
  )
}
