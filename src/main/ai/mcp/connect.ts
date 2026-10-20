// The chat's MCP server and client, linked in memory: the model's tool calls go through the same
// protocol an outside MCP client would use.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolCallView } from '@shared/types/chat'
import type { ToolCall, ToolSpec } from '../chat/messages'
import { registerDatabaseTools, type AiDatabase, type ToolHooks } from './tools/index'

export interface ConnectedTools {
  specs: ToolSpec[]
  call(call: ToolCall): Promise<{ content: string; isError: boolean; view: ToolCallView }>
  close(): Promise<void>
}

const IDENTITY = { name: 'sqliteview', version: '1.0.0' }

export async function connectTools(db: AiDatabase, approve: ToolHooks['approve']): Promise<ConnectedTools> {
  let reported: Omit<ToolCallView, 'id' | 'name' | 'input'> | null = null
  const server = new McpServer(IDENTITY)
  registerDatabaseTools(server, db, { approve, report: (view) => (reported = view) })
  const client = new Client({ name: 'sqliteview-chat', version: IDENTITY.version })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverSide), client.connect(clientSide)])
  const { tools } = await client.listTools()

  return {
    specs: tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema as Record<string, unknown>,
    })),

    async call({ id, name, input }) {
      reported = null
      let content: string
      let isError: boolean
      try {
        const result = await client.callTool({ name, arguments: input })
        const blocks = (result.content ?? []) as { type: string; text?: string }[]
        content = blocks.flatMap((b) => (b.type === 'text' && b.text ? [b.text] : [])).join('\n')
        isError = result.isError === true
      } catch (err) {
        content = (err as Error).message
        isError = true
      }
      const view: ToolCallView = {
        id,
        name,
        input,
        ...(reported ?? {
          status: isError ? 'error' : 'done',
          summary: isError ? `${name} failed` : name,
          ...(isError && { error: content }),
        }),
      }
      return { content, isError, view }
    },

    async close() {
      await client.close()
      await server.close()
    },
  }
}
