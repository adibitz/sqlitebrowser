import { parseSetting, settingsWithDefaults, type SettingKey, type Settings } from '@shared/settings/schema'
import type { PrefsDb } from './database'

export interface SettingsStore {
  getAll(): Settings
  get<K extends SettingKey>(key: K): Settings[K]
  /** Validates and saves one setting; throws if the value doesn't fit the key. */
  set<K extends SettingKey>(key: K, value: unknown): Settings[K]
}

export function createSettingsStore(db: PrefsDb): SettingsStore {
  const selectAll = db.prepare<[], { key: string; value: string }>('SELECT key, value FROM settings')
  const upsert = db.prepare<[string, string]>(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )

  function getAll(): Settings {
    const stored: Record<string, unknown> = {}
    for (const row of selectAll.all()) {
      try {
        stored[row.key] = JSON.parse(row.value)
      } catch {
        // A corrupt value falls back to its default in settingsWithDefaults.
      }
    }
    return settingsWithDefaults(stored)
  }

  return {
    getAll,
    get: (key) => getAll()[key],
    set(key, value) {
      const parsed = parseSetting(key, value)
      upsert.run(key, JSON.stringify(parsed))
      return parsed
    },
  }
}
