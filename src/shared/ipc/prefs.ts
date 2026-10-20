import { z } from 'zod'
import { SETTING_KEYS, type SettingKey, type Settings } from '../settings/schema'

export const prefsChannels = {
  getAll: 'prefs:getAll',
  set: 'prefs:set',
} as const

export const prefsSchemas = {
  getAll: z.undefined(),
  // The value is checked against the key's own schema in the handler.
  set: z.object({
    key: z.enum(SETTING_KEYS as [SettingKey, ...SettingKey[]]),
    value: z.unknown(),
  }),
}

export interface PrefsApi {
  getAll(): Promise<Settings>
  set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void>
}
