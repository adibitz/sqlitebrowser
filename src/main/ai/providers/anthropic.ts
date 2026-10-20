import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '../chat/messages'
import { MAX_REPLY_TOKENS, type ChatProvider } from './provider'

type AnthropicMessage = Anthropic.MessageParam

function toAnthropic(messages: readonly ChatMessage[]): AnthropicMessage[] {
  return messages.map((m): AnthropicMessage => {
    if (m.role === 'user') return { role: 'user', content: m.text }
    if (m.role === 'assistant') {
      const content: Anthropic.ContentBlockParam[] = [
        ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
        ...m.toolCalls.map((c) => ({ type: 'tool_use' as const, id: c.id, name: c.name, input: c.input })),
      ]
      return { role: 'assistant', content: content.length ? content : [{ type: 'text', text: '…' }] }
    }
    return {
      role: 'user',
      content: m.results.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.callId,
        content: r.content,
        is_error: r.isError,
      })),
    }
  })
}

export function anthropicProvider(options: { apiKey: string | null; baseUrl: string | null }): ChatProvider {
  const client = new Anthropic({ apiKey: options.apiKey ?? undefined, baseURL: options.baseUrl ?? undefined })
  return {
    async reply(req, onText) {
      const stream = client.messages.stream(
        {
          model: req.model,
          max_tokens: MAX_REPLY_TOKENS,
          system: req.system,
          messages: toAnthropic(req.messages),
          tools: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
          })),
        },
        { signal: req.signal },
      )
      stream.on('text', onText)
      const message = await stream.finalMessage()
      return {
        text: message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''),
        toolCalls: message.content.flatMap((b) =>
          b.type === 'tool_use'
            ? [{ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }]
            : [],
        ),
      }
    },

    async listModels() {
      const ids: string[] = []
      for await (const model of client.models.list({ limit: 100 })) ids.push(model.id)
      return ids
    },
  }
}
