import type { ProviderSummary } from '@shared/ai/providers'
import { anthropicProvider } from './anthropic'
import { openAiCompatibleProvider } from './openaiCompatible'
import type { ChatProvider } from './provider'

export function createProvider(provider: ProviderSummary, apiKey: string | null): ChatProvider {
  const options = { apiKey, baseUrl: provider.baseUrl }
  return provider.kind === 'anthropic' ? anthropicProvider(options) : openAiCompatibleProvider(options)
}
