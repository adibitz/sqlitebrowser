import { z } from 'zod'
import { requireExistingFile } from '../../pathChecks'
import { json, type ToolContext } from './context'

/** MCP tool open_database. */
export function registerOpenDatabase(ctx: ToolContext): void {
  ctx.server.registerTool(
    'open_database',
    {
      description:
        'Opens a SQLite database file (or a .sqbpro project) in SQliteView, as File > Open would. If the current ' +
        'database has uncommitted changes, the user is asked whether to save or discard them first.',
      inputSchema: {
        path: z.string().min(1).max(4096).describe('Absolute path of the file'),
        read_only: z.boolean().optional().describe('Open read-only (default false)'),
      },
    },
    ({ path, read_only = false }) =>
      ctx.guarded(async () => {
        const file = requireExistingFile(path)
        await ctx.host.ui({ kind: 'openDatabase', path: file, readOnly: read_only })
        const { path: opened, readOnly } = ctx.host.dbState()
        return json({ opened, readOnly })
      }),
  )
}
