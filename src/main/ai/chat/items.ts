import type { ChatItem } from '@shared/types/chat'
import type { ChatMessage } from './messages'

/** A stored conversation as the panel shows it. */
export function toChatItems(messages: readonly ChatMessage[]): ChatItem[] {
  return messages.flatMap((m, i): ChatItem[] => {
    if (m.role === 'user') return [{ kind: 'user', id: `m${i}`, text: m.text }]
    if (m.role === 'assistant') return m.text ? [{ kind: 'assistant', id: `m${i}`, text: m.text }] : []
    return m.results.flatMap((r) =>
      r.view ? [{ kind: 'tool' as const, id: `m${i}-${r.callId}`, call: r.view }] : [],
    )
  })
}
