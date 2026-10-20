import { z } from 'zod'
import { json, type ToolContext } from './context'

/** MCP tool run_query. */
export function registerRunQuery(ctx: ToolContext): void {
  ctx.server.registerTool(
    'run_query',
    {
      description:
        'Runs one read-only SQLite statement (SELECT, WITH … SELECT, read-only PRAGMA) and returns up to 200 rows. ' +
        'Statements that change anything are refused; use run_sql for those.',
      inputSchema: { sql: z.string().min(1).max(100_000).describe('One SQLite statement that only reads') },
      annotations: { readOnlyHint: true },
    },
    ({ sql }) => ctx.guarded(async () => json(await ctx.db.runQuery(sql))),
  )
}
