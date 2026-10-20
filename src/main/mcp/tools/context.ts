// What every MCP tool shares: the database, the app around it, and small helpers.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { DbState } from '@shared/types/db'
import type { UiAction, UiSnapshot } from '@shared/types/mcp'
import type { BrowseQuery } from '@shared/types/rows'
import type { ObjectRef } from '@shared/types/schema'
import type { describeTable, TableListing, ToolTable } from '../../core/mcpTools'

/** The database as the tools reach it (the DB worker in the app, a session in tests). */
export interface McpDatabase {
  listTables(): Promise<TableListing[]>
  describeTable(ref: ObjectRef): Promise<ReturnType<typeof describeTable>>
  sampleRows(ref: ObjectRef, limit: number): Promise<ToolTable>
  runQuery(sql: string): Promise<ToolTable>
  runSql(sql: string): Promise<{ changes: number }>
  countRows(query: BrowseQuery): Promise<number>
  write(): Promise<DbState>
  revert(): Promise<DbState>
}

/** The app around the database: its state, its window and the user. */
export interface McpHost {
  dbState(): DbState
  /** What the window shows; null until the main window has reported it. */
  uiSnapshot(): UiSnapshot | null
  /** Asks the window to do something; rejects with a message for the client when it can't. */
  ui(action: UiAction): Promise<void>
  /** Asks the user before pending changes are written; true = write. */
  confirmWrite(): Promise<boolean>
  /** Tells the window that table data changed, so grids reload. */
  dataChanged(): void
  /** LIKE escape character for filters ('databrowser/filter_escape'). */
  filterEscape(): string
}

export const json = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
})
export const failure = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
})

export const tableInput = {
  table: z.string().min(1).max(512).describe('Table or view name'),
  schema: z
    .string()
    .max(512)
    .optional()
    .describe("Schema: 'main' unless the table is in an attached database"),
}

export interface ToolContext {
  server: McpServer
  db: McpDatabase
  host: McpHost
  /** Runs a tool body; errors become a tool error the client can read. */
  guarded(
    body: () => Promise<ReturnType<typeof json>>,
  ): Promise<ReturnType<typeof json> | ReturnType<typeof failure>>
  /** A table named by the client, found in any attached schema when it gave none. */
  resolve(table: string, schema?: string): Promise<ObjectRef>
  /** Throws unless a database is open in the app. */
  requireOpen(): DbState
}

export function createToolContext(server: McpServer, db: McpDatabase, host: McpHost): ToolContext {
  return {
    server,
    db,
    host,
    async guarded(body) {
      try {
        return await body()
      } catch (err) {
        return failure((err as Error).message)
      }
    },
    async resolve(table, schema) {
      if (schema) return { schema, name: table }
      const found = (await db.listTables()).find((t) => t.name.toLowerCase() === table.toLowerCase())
      return found ? { schema: found.schema, name: found.name } : { schema: 'main', name: table }
    },
    requireOpen() {
      const state = host.dbState()
      if (!state.isOpen) throw new Error('No database is open in SQliteView. Open one with open_database.')
      return state
    },
  }
}
