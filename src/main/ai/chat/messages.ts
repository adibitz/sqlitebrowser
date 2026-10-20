// The conversation in a provider-neutral form; adapters translate it for each API, and history
// stores it as JSON in app.db.
import type { ToolCallView } from '@shared/types/chat'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  callId: string
  /** What the model reads (JSON text). */
  content: string
  isError: boolean
  /** What the panel shows; not sent to the model. */
  view?: ToolCallView
}

export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: ToolCall[] }
  | { role: 'tool'; results: ToolResult[] }

/** A tool as the model sees it. */
export interface ToolSpec {
  name: string
  description: string
  /** JSON Schema of the input. */
  inputSchema: Record<string, unknown>
}

/**
 * Every tool call needs a result before the conversation goes on (the APIs reject it otherwise). A chat
 * that stopped in the middle gets "not run" results for the calls left open.
 */
export function withToolResults(messages: readonly ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  const patched = new Map<number, ChatMessage>()
  messages.forEach((original, i) => {
    const m = patched.get(i) ?? original
    out.push(m)
    if (m.role !== 'assistant' || !m.toolCalls.length) return
    const next = patched.get(i + 1) ?? messages[i + 1]
    const answered = new Set(next?.role === 'tool' ? next.results.map((r) => r.callId) : [])
    const missing = m.toolCalls.filter((c) => !answered.has(c.id))
    if (!missing.length) return
    const results = missing.map((c) => ({
      callId: c.id,
      content: 'Not run: the chat was stopped.',
      isError: true,
    }))
    if (next?.role === 'tool') patched.set(i + 1, { role: 'tool', results: [...next.results, ...results] })
    else out.push({ role: 'tool', results })
  })
  return out
}
