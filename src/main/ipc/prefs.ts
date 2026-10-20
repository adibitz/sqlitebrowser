import type { SettingKey } from '@shared/settings/schema'
import { prefsChannels, prefsSchemas } from '@shared/ipc/prefs'
import type { SettingsStore } from '../prefs/settings'
import { UserError } from '../errors'
import { requireApprovedExtensions } from '../pathChecks'
import { handle } from './handle'

export interface PrefsIpcDeps {
  settings: SettingsStore
  /** Called after a setting was saved, for side effects in main (theme, …). */
  onChange: (key: SettingKey) => void
}

export function registerPrefsIpc({ settings, onChange }: PrefsIpcDeps): void {
  handle(prefsChannels.getAll, prefsSchemas.getAll, () => settings.getAll())

  handle(prefsChannels.set, prefsSchemas.set, ({ key, value }) => {
    if (key === 'extensions/list' && Array.isArray(value)) {
      requireApprovedExtensions(value.map(String), settings.get('extensions/list'))
    }
    try {
      settings.set(key, value)
    } catch {
      throw new UserError(`That value isn't allowed for ${key}.`)
    }
    onChange(key)
  })
}
