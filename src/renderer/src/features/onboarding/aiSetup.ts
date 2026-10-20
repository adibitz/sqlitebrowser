import { DEFAULT_MODEL, type ProviderKind } from '@shared/ai/providers'
import type { SaveProviderRequest } from '@shared/ipc/ai'

/** What the user has typed in the AI step so far. */
export interface AiDraft {
  enabled: boolean
  kind: ProviderKind
  apiKey: string
  baseUrl: string
  model: string
}

export type AiDraftErrors = Partial<Record<'apiKey' | 'baseUrl' | 'model', string>>

export const initialAiDraft: AiDraft = {
  enabled: false,
  kind: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: DEFAULT_MODEL.anthropic,
}

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  anthropic: 'Claude (Anthropic)',
  openai_compatible: 'OpenAI-compatible (OpenAI, Ollama, LM Studio)',
}

/** Switching provider resets the model to that provider's default. */
export function withKind(draft: AiDraft, kind: ProviderKind): AiDraft {
  return { ...draft, kind, model: DEFAULT_MODEL[kind] }
}

/**
 * Checks the draft. Returns the provider to save, `null` when AI stays off, or the errors to show.
 */
export function validateAiDraft(
  draft: AiDraft,
): { ok: true; request: SaveProviderRequest | null } | { ok: false; errors: AiDraftErrors } {
  if (!draft.enabled) return { ok: true, request: null }

  const apiKey = draft.apiKey.trim()
  const baseUrl = draft.baseUrl.trim()
  const model = draft.model.trim()
  const errors: AiDraftErrors = {}

  if (draft.kind === 'anthropic' && !apiKey) {
    errors.apiKey = 'Enter your Anthropic API key. It starts with sk-ant-.'
  }
  if (draft.kind === 'openai_compatible') {
    if (!baseUrl) errors.baseUrl = 'Enter the server address, like http://localhost:11434/v1.'
    else if (!isHttpUrl(baseUrl)) errors.baseUrl = 'Use a full address starting with http:// or https://.'
  }
  if (!model) errors.model = 'Enter the model to use, like llama3.1 or gpt-4.1.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    request: {
      kind: draft.kind,
      name: draft.kind === 'anthropic' ? 'Claude' : new URL(baseUrl).host,
      baseUrl: draft.kind === 'anthropic' ? null : baseUrl,
      apiKey: apiKey || null,
      defaultModel: model,
    },
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
