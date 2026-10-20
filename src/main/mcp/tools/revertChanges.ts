import { json, type ToolContext } from './context'

/** MCP tool revert_changes. */
export function registerRevertChanges(ctx: ToolContext): void {
  ctx.server.registerTool(
    'revert_changes',
    {
      description: "Undoes every uncommitted change since the last write (yours and the user's).",
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    () =>
      ctx.guarded(async () => {
        if (!ctx.requireOpen().dirty)
          return json({ reverted: false, note: 'There were no uncommitted changes.' })
        await ctx.db.revert()
        ctx.host.dataChanged()
        return json({ reverted: true })
      }),
  )
}
