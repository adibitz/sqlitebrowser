// What MCP tools ask the window to do, done the way the user would (same actions as the UI).
import type { UiAction } from '@shared/types/mcp'
import { openDatabaseAt } from '@/features/database/actions'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'

/** Runs an action; throws with a message for the client when it didn't happen. */
export async function runUiAction(action: UiAction): Promise<void> {
  const tabs = useTabsStore.getState()
  switch (action.kind) {
    case 'openDatabase':
      if (!(await openDatabaseAt(action.path, action.readOnly))) {
        throw new Error(
          "The database didn't open: the user kept the current one, or SQliteView showed an error.",
        )
      }
      return
    case 'openTable': {
      tabs.openTable(action.table, 'data')
      const id = useTabsStore.getState().activeId
      if (id) {
        tabs.updateBrowse(id, {
          filters: action.filters,
          globalFilter: action.search,
          sort: action.sort,
          page: 0,
        })
      }
      return
    }
    case 'openSql':
      tabs.openSql({
        text: action.sql,
        ...(action.run && useDbStore.getState().state.isOpen && { autoRun: 'run' as const }),
      })
  }
}
