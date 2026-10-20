export const PROVIDER_KINDS = ['anthropic', 'openai_compatible'] as const
export type ProviderKind = (typeof PROVIDER_KINDS)[number]

/** Model preselected for a new provider. The user can type any other model id. */
export const DEFAULT_MODEL: Record<ProviderKind, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai_compatible: '',
}

/** Provider as the renderer sees it. The API key never leaves main; only whether one is stored. */
export interface ProviderSummary {
  id: number
  kind: ProviderKind
  name: string
  baseUrl: string | null
  defaultModel: string
  hasApiKey: boolean
}
