import { z } from 'zod'
import type { McpStatus, UiReply, UiRequest, UiSnapshot } from '../types/mcp'

export const mcpChannels = {
  status: 'mcp:status',
  copyCommand: 'mcp:copyCommand',
  regenerateToken: 'mcp:regenerateToken',
  reply: 'mcp:reply',
  reportUi: 'mcp:reportUi',
} as const

/** Pushed from main to the renderer. */
export const mcpEvents = {
  statusChanged: 'mcp:statusChanged',
  /** An MCP tool asks the window to do something; answer with `reply`. */
  uiRequest: 'mcp:uiRequest',
} as const

const requestId = z.string().min(1).max(100)
const tabId = z.string().max(600)

export const mcpSchemas = {
  status: z.undefined(),
  copyCommand: z.undefined(),
  regenerateToken: z.undefined(),
  reply: z.discriminatedUnion('ok', [
    z.object({ requestId, ok: z.literal(true) }),
    z.object({ requestId, ok: z.literal(false), message: z.string().max(2000) }),
  ]) satisfies z.ZodType<UiReply>,
  reportUi: z.object({
    tabs: z
      .array(
        z.object({
          id: tabId,
          kind: z.enum(['table', 'schema', 'info', 'sql']),
          title: z.string().max(600),
          description: z.string().max(4000),
        }),
      )
      .max(500),
    activeTabId: tabId.nullable(),
  }) satisfies z.ZodType<UiSnapshot>,
}

export interface McpApi {
  status(): Promise<McpStatus>
  /** Copies the `claude mcp add` command (with the token) to the clipboard; the token stays in main. */
  copyCommand(): Promise<void>
  /** Replaces the token; clients connected with the old one have to be added again. */
  regenerateToken(): Promise<void>
  reply(reply: UiReply): Promise<void>
  reportUi(snapshot: UiSnapshot): Promise<void>
  onStatus(listener: (status: McpStatus) => void): () => void
  onUiRequest(listener: (request: UiRequest) => void): () => void
}
