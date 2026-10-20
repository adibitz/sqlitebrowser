import { MEMORY_DATABASE } from '@shared/types/db'
import { json, type ToolContext } from './context'

/** MCP tool get_app_state. */
export function registerGetAppState(ctx: ToolContext): void {
  ctx.server.registerTool(
    'get_app_state',
    {
      description:
        'What SQliteView shows right now: the open database, whether it has uncommitted changes, and the open ' +
        'tabs (tables with their filters, search and sort; SQL editors with their text). Start here.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () =>
      ctx.guarded(async () => {
        const { isOpen, path, readOnly, dirty } = ctx.host.dbState()
        const ui = ctx.host.uiSnapshot()
        return json({
          database: isOpen
            ? {
                path: path === MEMORY_DATABASE ? 'in-memory database' : path,
                readOnly,
                uncommittedChanges: dirty,
              }
            : null,
          tabs: ui?.tabs ?? [],
          activeTabId: ui?.activeTabId ?? null,
        })
      }),
  )
}
