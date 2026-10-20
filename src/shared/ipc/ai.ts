import { z } from 'zod'
import { PROVIDER_KINDS, type ProviderSummary } from '../ai/providers'
import type { ChatEvent, ChatItem } from '../types/chat'

export const aiChannels = {
  listProviders: 'ai:listProviders',
  saveProvider: 'ai:saveProvider',
  deleteProvider: 'ai:deleteProvider',
  canEncryptKeys: 'ai:canEncryptKeys',
  listModels: 'ai:listModels',
  send: 'ai:send',
  stop: 'ai:stop',
  approve: 'ai:approve',
  history: 'ai:history',
  clearHistory: 'ai:clearHistory',
} as const

/** Pushed from main to the renderer while a reply is produced. */
export const aiEvents = {
  chat: 'ai:chat',
} as const

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), 'Use an http:// or https:// address')

const providerId = z.number().int().positive()
const model = z.string().trim().min(1).max(200)

export const aiSchemas = {
  listProviders: z.undefined(),
  saveProvider: z.object({
    kind: z.enum(PROVIDER_KINDS),
    name: z.string().trim().min(1).max(100),
    baseUrl: httpUrl.nullable(),
    apiKey: z.string().trim().max(500).nullable(),
    defaultModel: z.string().trim().min(1).max(200),
  }),
  deleteProvider: z.object({ id: providerId }),
  canEncryptKeys: z.undefined(),
  listModels: z.object({ providerId }),
  send: z.object({
    text: z.string().trim().min(1).max(100_000),
    context: z.object({ activeTab: z.string().max(2000).nullable() }),
    providerId,
    model,
  }),
  stop: z.object({ sessionId: z.number().int().positive() }),
  approve: z.object({ approvalId: z.string().min(1).max(100), approved: z.boolean() }),
  history: z.undefined(),
  clearHistory: z.undefined(),
}

export type SaveProviderRequest = z.infer<typeof aiSchemas.saveProvider>

export interface ChatHistory {
  /** The conversation of the open database; null before the first message. */
  sessionId: number | null
  items: ChatItem[]
}

export interface AiApi {
  listProviders(): Promise<ProviderSummary[]>
  /** Saves a new provider and returns it. */
  saveProvider(req: SaveProviderRequest): Promise<ProviderSummary>
  deleteProvider(req: z.infer<typeof aiSchemas.deleteProvider>): Promise<void>
  /** False when the OS can't encrypt secrets; keys then live in memory for this session only. */
  canEncryptKeys(): Promise<boolean>
  /** Models the provider offers (empty when it can't list them; any model id can be typed). */
  listModels(req: z.infer<typeof aiSchemas.listModels>): Promise<string[]>
  /** Sends a message about the open database; the reply arrives as chat events. */
  send(req: z.infer<typeof aiSchemas.send>): Promise<{ sessionId: number }>
  stop(req: z.infer<typeof aiSchemas.stop>): Promise<void>
  /** Answers a write the model asked to run. */
  approve(req: z.infer<typeof aiSchemas.approve>): Promise<void>
  /** The chat kept for the open database file. */
  history(): Promise<ChatHistory>
  clearHistory(): Promise<void>
  onChat(listener: (event: ChatEvent) => void): () => void
}
