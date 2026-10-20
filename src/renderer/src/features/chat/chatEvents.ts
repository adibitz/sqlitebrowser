// How chat events from main change what the panel shows (pure, so it can be tested without a window).
import type { ChatEvent, ChatItem } from '@shared/types/chat'

export interface ChatView {
  items: ChatItem[]
  /** Assistant item receiving streamed text; null starts a new one. */
  streamingId: string | null
  busy: boolean
  sessionId: number | null
}

let counter = 0
/** A new item id (ids only need to be unique within the window). */
export const nextId = (): string => `c${++counter}`

/** Applies one event from main to the item list (pure, for testing). */
export function applyChatEvent(state: ChatView, event: ChatEvent): ChatView {
  const items = state.items
  switch (event.kind) {
    case 'text': {
      if (state.streamingId && items.at(-1)?.id === state.streamingId) {
        const last = items.at(-1) as Extract<ChatItem, { kind: 'assistant' }>
        return { ...state, items: [...items.slice(0, -1), { ...last, text: last.text + event.delta }] }
      }
      const id = nextId()
      return { ...state, streamingId: id, items: [...items, { kind: 'assistant', id, text: event.delta }] }
    }
    case 'toolCall': {
      const at = items.findIndex((i) => i.kind === 'tool' && i.call.id === event.call.id)
      const item: ChatItem = { kind: 'tool', id: at >= 0 ? items[at]!.id : nextId(), call: event.call }
      return {
        ...state,
        streamingId: null,
        items: at >= 0 ? items.map((i, n) => (n === at ? item : i)) : [...items, item],
      }
    }
    case 'approval':
      return {
        ...state,
        streamingId: null,
        items: [
          ...items,
          { kind: 'approval', id: nextId(), approvalId: event.approvalId, sql: event.sql, state: 'pending' },
        ],
      }
    case 'approvalSettled':
      return {
        ...state,
        items: items.map((i) =>
          i.kind === 'approval' && i.approvalId === event.approvalId
            ? { ...i, state: event.approved ? 'approved' : 'denied' }
            : i,
        ),
      }
    case 'done': {
      const note = event.error ?? (event.stopped ? 'Stopped.' : null)
      return {
        ...state,
        busy: false,
        streamingId: null,
        items: note ? [...items, { kind: 'error', id: nextId(), text: note }] : items,
      }
    }
  }
}
