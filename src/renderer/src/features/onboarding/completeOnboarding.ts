import { useSettingsStore } from '@/store/settings'

/** Saves the MCP choice and marks onboarding as done, which swaps in the start page. */
export async function completeOnboarding(mcpEnabled: boolean): Promise<void> {
  const { update } = useSettingsStore.getState()
  if (mcpEnabled) await update('MCP/enabled', true)
  await update('General/onboarded', true)
}
