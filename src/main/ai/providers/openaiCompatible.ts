// Anything that speaks the OpenAI chat completions API: OpenAI, OpenRouter, LM Studio, Ollama
// (http://localhost:11434/v1), and the fake server of the end-to-end tests.
import { randomUUID } from 'node:crypto'
import OpenAI from 'openai'
import type { ChatMessage } from '../chat/messages'
import { MAX_REPLY_TOKENS, type ChatProvider } from './provider'

type OpenAiMessage = OpenAI.Chat.ChatCompletionMessageParam

function toOpenAi(messages: readonly ChatMessage[]): OpenAiMessage[] {
  return messages.flatMap((m): OpenAiMessage[] => {
    if (m.role === 'user') return [{ role: 'user', content: m.text }]
    if (m.role === 'assistant') {
      return [
        {
          role: 'assistant',
          content: m.text || null,
          ...(m.toolCalls.length && {
            tool_calls: m.toolCalls.map((c) => ({
              id: c.id,
              type: 'function' as const,
              function: { name: c.name, arguments: JSON.stringify(c.input) },
            })),
          }),
        },
      ]
    }
    return m.results.map((r) => ({ role: 'tool' as const, tool_call_id: r.callId, content: r.content }))
  })
}

function parseArguments(text: string): Record<string, unknown> {
  if (!text.trim()) return {}
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function openAiCompatibleProvider(options: {
  apiKey: string | null
  baseUrl: string | null
}): ChatProvider {
  // Local servers need no key, but the client insists on one.
  const client = new OpenAI({ apiKey: options.apiKey || 'not-needed', baseURL: options.baseUrl ?? undefined })
  return {
    async reply(req, onText) {
      const stream = await client.chat.completions.create(
        {
          model: req.model,
          stream: true,
          max_tokens: MAX_REPLY_TOKENS,
          messages: [{ role: 'system', content: req.system }, ...toOpenAi(req.messages)],
          ...(req.tools.length && {
            tools: req.tools.map((t) => ({
              type: 'function' as const,
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
          }),
        },
        { signal: req.signal },
      )
      let text = ''
      const calls: { id: string; name: string; args: string }[] = []
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          text += delta.content
          onText(delta.content)
        }
        for (const tc of delta?.tool_calls ?? []) {
          const slot = (calls[tc.index] ??= { id: '', name: '', args: '' })
          if (tc.id) slot.id = tc.id
          if (tc.function?.name) slot.name += tc.function.name
          if (tc.function?.arguments) slot.args += tc.function.arguments
        }
      }
      return {
        text,
        toolCalls: calls
          .filter((c) => c?.name)
          .map((c) => ({ id: c.id || randomUUID(), name: c.name, input: parseArguments(c.args) })),
      }
    },

    async listModels() {
      const ids: string[] = []
      for await (const model of client.models.list()) ids.push(model.id)
      return ids.sort()
    },
  }
}
