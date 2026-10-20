// Port of the plan's ai/chat/loop: the conversation goes to the model with the MCP tools; tool calls
// run through the MCP client until the model answers. Everything is saved to the chat history.
import type { ChatContext, ChatEvent, ToolCallView } from '@shared/types/chat'
import type { ChatHistoryStore } from '../../prefs/chatHistory'
import { connectTools, type ConnectedTools } from '../mcp/connect'
import type { AiDatabase } from '../mcp/tools/index'
import type { ChatProvider } from '../providers/provider'
import type { Approvals } from './approvals'
import { withToolResults, type ChatMessage, type ToolCall, type ToolResult } from './messages'
import { systemPrompt, type DatabaseFacts } from './systemPrompt'

/** Tool rounds per reply before the loop gives up. */
export const MAX_ROUNDS = 12

export interface ChatRunDeps {
  provider: ChatProvider
  model: string
  db: AiDatabase
  facts: DatabaseFacts
  history: ChatHistoryStore
  approvals: Approvals
  emit: (event: ChatEvent) => void
}

function runningSummary(call: ToolCall): string {
  const table = typeof call.input.table === 'string' ? call.input.table : 'a table'
  switch (call.name) {
    case 'list_tables':
      return 'Listing tables…'
    case 'describe_table':
      return `Looking at ${table}…`
    case 'sample_rows':
      return `Reading ${table}…`
    case 'run_query':
      return 'Running a query…'
    case 'run_sql':
      return 'Waiting for your approval…'
    default:
      return `Running ${call.name}…`
  }
}

function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  return message.length > 500 ? message.slice(0, 500) + '…' : message
}

/** Answers `text` in conversation `sessionId`, streaming events until a final 'done'. */
export async function runChat(
  deps: ChatRunDeps,
  sessionId: number,
  text: string,
  context: ChatContext,
  signal: AbortSignal,
): Promise<void> {
  const { provider, history, emit } = deps
  history.add(sessionId, { role: 'user', text })
  const messages: ChatMessage[] = withToolResults(history.messages(sessionId))
  let dataChanged = false
  let tools: ConnectedTools | null = null
  try {
    tools = await connectTools(deps.db, (sql) =>
      deps.approvals.request(sql, signal, (approvalId) =>
        emit({ kind: 'approval', sessionId, approvalId, sql }),
      ),
    )
    for (let round = 0; ; round++) {
      if (round >= MAX_ROUNDS) {
        throw new Error(`The model kept calling tools without answering; stopped after ${MAX_ROUNDS} rounds.`)
      }
      const reply = await provider.reply(
        {
          model: deps.model,
          system: systemPrompt(deps.facts, context),
          messages,
          tools: tools.specs,
          signal,
        },
        (delta) => emit({ kind: 'text', sessionId, delta }),
      )
      const assistant: ChatMessage = { role: 'assistant', text: reply.text, toolCalls: reply.toolCalls }
      messages.push(assistant)
      history.add(sessionId, assistant)
      if (!reply.toolCalls.length) break

      const results: ToolResult[] = []
      for (const call of reply.toolCalls) {
        if (signal.aborted) {
          results.push({ callId: call.id, content: 'Not run: the chat was stopped.', isError: true })
          continue
        }
        const running: ToolCallView = {
          id: call.id,
          name: call.name,
          input: call.input,
          status: 'running',
          summary: runningSummary(call),
        }
        emit({ kind: 'toolCall', sessionId, call: running })
        const done = await tools.call(call)
        if (call.name === 'run_sql' && done.view.status === 'done') dataChanged = true
        emit({ kind: 'toolCall', sessionId, call: done.view })
        results.push({ callId: call.id, content: done.content, isError: done.isError, view: done.view })
      }
      const toolMessage: ChatMessage = { role: 'tool', results }
      messages.push(toolMessage)
      history.add(sessionId, toolMessage)
      if (signal.aborted) break
    }
    emit({ kind: 'done', sessionId, dataChanged, ...(signal.aborted && { stopped: true }) })
  } catch (err) {
    emit({
      kind: 'done',
      sessionId,
      dataChanged,
      ...(signal.aborted ? { stopped: true } : { error: describeError(err) }),
    })
  } finally {
    await tools?.close()
  }
}
