import type { ChatMessage, ToolCall, ToolSpec } from '../chat/messages'

export interface ChatRequest {
  model: string
  system: string
  messages: ChatMessage[]
  tools: ToolSpec[]
  signal: AbortSignal
}

export interface ChatReply {
  text: string
  toolCalls: ToolCall[]
}

/** One AI API (Anthropic, or anything that speaks the OpenAI chat API). */
export interface ChatProvider {
  /** Streams one reply; `onText` receives the text as it arrives. */
  reply(req: ChatRequest, onText: (delta: string) => void): Promise<ChatReply>
  /** Model ids the provider offers. */
  listModels(): Promise<string[]>
}

/** Room for answers with tables in them; the model stops earlier when it is done. */
export const MAX_REPLY_TOKENS = 8192
