/** The MCP server that lets Claude Code (or another MCP client) work with the app. */
import type { SortSpec } from './rows'
import type { ObjectRef } from './schema'

export type McpStatus =
  { state: 'off' } | { state: 'running'; url: string } | { state: 'error'; message: string }

/** Something an MCP tool asks the window to do, the way the user would do it. */
export type UiAction =
  | { kind: 'openDatabase'; path: string; readOnly: boolean }
  | {
      kind: 'openTable'
      table: ObjectRef
      filters: Record<string, string>
      search: string
      sort: SortSpec[]
    }
  | { kind: 'openSql'; sql: string; run: boolean }

/** Pushed from main; the renderer answers with a UiReply carrying the same id. */
export interface UiRequest {
  requestId: string
  action: UiAction
}

export type UiReply = { requestId: string; ok: true } | { requestId: string; ok: false; message: string }

export interface UiTab {
  id: string
  kind: 'table' | 'schema' | 'info' | 'sql'
  title: string
  /** In words, with filters, search and sort, or the SQL in an editor. */
  description: string
}

/** What the window shows, reported by the renderer whenever its tabs change. */
export interface UiSnapshot {
  tabs: UiTab[]
  activeTabId: string | null
}
