import type { SaveProviderRequest } from '@shared/ipc/ai'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/store/settings'

/** Saves the AI provider (if any) and marks onboarding as done, which swaps in the start page. */
export async function completeOnboarding(provider: SaveProviderRequest | null): Promise<void> {
  const { update } = useSettingsStore.getState()
  if (provider) {
    const saved = await api.ai.saveProvider(provider)
    await update('ai/activeProviderId', saved.id)
    await update('ai/enabled', true)
  }
  await update('General/onboarded', true)
}
