// What every MCP tool shares: the database, the hooks to the chat, and small helpers.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ToolCallView } from '@shared/types/chat'
import type { ObjectRef } from '@shared/types/schema'
import type { describeTable, TableListing, ToolTable } from '../../../core/aiTools'

/** The database as the tools reach it (the DB worker in the app, a session in tests). */
export interface AiDatabase {
  listTables(): Promise<TableListing[]>
  describeTable(ref: ObjectRef): Promise<ReturnType<typeof describeTable>>
  sampleRows(ref: ObjectRef, limit: number): Promise<ToolTable>
  runQuery(sql: string): Promise<ToolTable>
  runSql(sql: string): Promise<{ changes: number }>
}

export interface ToolHooks {
  /** Asks the user to approve a change; resolves false when denied, stopped or timed out. */
  approve(sql: string): Promise<boolean>
  /** Receives what the panel shows for the call that just finished. */
  report(view: Omit<ToolCallView, 'id' | 'name' | 'input'>): void
}

export const plural = (n: number, word: string): string =>
  `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

export function rowsText(t: ToolTable): string {
  return `${plural(t.truncated ? t.total - 1 : t.total, 'row')}${t.truncated ? '+' : ''}`
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
  db: AiDatabase
  hooks: ToolHooks
  /** Runs a tool body; errors become a tool error the model can read and the panel can show. */
  guarded(
    summary: string,
    body: () => Promise<ReturnType<typeof json>>,
  ): Promise<ReturnType<typeof json> | ReturnType<typeof failure>>
  /** A table named by the model, found in any attached schema when it gave none. */
  resolve(table: string, schema?: string): Promise<ObjectRef>
}

export function createToolContext(server: McpServer, db: AiDatabase, hooks: ToolHooks): ToolContext {
  return {
    server,
    db,
    hooks,
    async guarded(summary, body) {
      try {
        return await body()
      } catch (err) {
        const message = (err as Error).message
        hooks.report({ status: 'error', summary, error: message })
        return failure(message)
      }
    },
    async resolve(table, schema) {
      if (schema) return { schema, name: table }
      const found = (await db.listTables()).find((t) => t.name.toLowerCase() === table.toLowerCase())
      return found ? { schema: found.schema, name: found.name } : { schema: 'main', name: table }
    },
  }
}
