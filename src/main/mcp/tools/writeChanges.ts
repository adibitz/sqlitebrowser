import { failure, json, type ToolContext } from './context'

/** MCP tool write_changes. */
export function registerWriteChanges(ctx: ToolContext): void {
  ctx.server.registerTool(
    'write_changes',
    {
      description:
        'Saves every uncommitted change to the database file. SQliteView asks the user first; once written, ' +
        'changes can no longer be reverted.',
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    () =>
      ctx.guarded(async () => {
        if (!ctx.requireOpen().dirty)
          return json({ written: false, note: 'There were no uncommitted changes.' })
        if (!(await ctx.host.confirmWrite())) {
          return failure('The user chose not to write the changes. They are still uncommitted.')
        }
        await ctx.db.write()
        return json({ written: true })
      }),
  )
}
