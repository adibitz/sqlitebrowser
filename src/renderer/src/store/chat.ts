import { create } from 'zustand'
import type { ProviderSummary } from '@shared/ai/providers'
import type { ChatContext, ChatEvent, ChatItem } from '@shared/types/chat'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { applyChatEvent, nextId } from '@/features/chat/chatEvents'

interface ChatState {
  providers: ProviderSummary[]
  sessionId: number | null
  items: ChatItem[]
  /** A reply is being produced. */
  busy: boolean
  /** Assistant item receiving streamed text; null starts a new one. */
  streamingId: string | null
  loadProviders(): Promise<void>
  /** Loads the conversation kept for the open database. */
  loadHistory(): Promise<void>
  send(text: string, context: ChatContext, providerId: number, model: string): Promise<void>
  stop(): Promise<void>
  approve(approvalId: string, approved: boolean): Promise<void>
  clear(): Promise<void>
  apply(event: ChatEvent): void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  providers: [],
  sessionId: null,
  items: [],
  busy: false,
  streamingId: null,

  async loadProviders() {
    set({ providers: await api.ai.listProviders() })
  },

  async loadHistory() {
    const history = await api.ai.history()
    set({ sessionId: history.sessionId, items: history.items, streamingId: null })
  },

  async send(text, context, providerId, model) {
    set({ busy: true, streamingId: null, items: [...get().items, { kind: 'user', id: nextId(), text }] })
    try {
      const { sessionId } = await api.ai.send({ text, context, providerId, model })
      set({ sessionId })
    } catch (err) {
      set({ busy: false, items: [...get().items, { kind: 'error', id: nextId(), text: errorMessage(err) }] })
    }
  },

  async stop() {
    const { sessionId } = get()
    if (sessionId !== null) await api.ai.stop({ sessionId })
  },

  async approve(approvalId, approved) {
    await api.ai.approve({ approvalId, approved })
  },

  async clear() {
    await api.ai.clearHistory()
    set({ sessionId: null, items: [], busy: false, streamingId: null })
  },

  apply(event) {
    const { sessionId, busy } = get()
    // Events of another conversation (e.g. one that was cleared) are dropped.
    if (sessionId !== null ? event.sessionId !== sessionId : !busy) return
    set(applyChatEvent({ ...get(), sessionId: event.sessionId }, event))
  },
}))
