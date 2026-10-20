import { create } from 'zustand'
import type { SettingKey, Settings } from '@shared/settings/schema'
import { api } from '@/lib/api'

interface SettingsState {
  settings: Settings | null
  loadError: string | null
  load(): Promise<void>
  /** Saves one setting. The UI updates at once and rolls back if main rejects the value. */
  update<K extends SettingKey>(key: K, value: Settings[K]): Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  loadError: null,

  async load() {
    try {
      set({ settings: await api.prefs.getAll(), loadError: null })
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : String(err) })
    }
  },

  async update(key, value) {
    const previous = get().settings
    if (!previous) return
    set({ settings: { ...previous, [key]: value } })
    try {
      await api.prefs.set(key, value)
    } catch (err) {
      set({ settings: previous })
      throw err
    }
  },
}))

/** Saves the settings that changed, one by one. */
export async function saveSettings(values: Partial<Settings>): Promise<void> {
  const { settings, update } = useSettingsStore.getState()
  for (const key of Object.keys(values) as SettingKey[]) {
    if (settings?.[key] !== values[key]) await update(key, values[key] as never)
  }
}

/** Reads one setting; undefined until settings have loaded. */
export function useSetting<K extends SettingKey>(key: K): Settings[K] | undefined {
  return useSettingsStore((s) => s.settings?.[key])
}
