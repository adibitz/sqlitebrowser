import type { DbOptions } from './core/db/session'
import type { SettingsStore } from './prefs/settings'

/** Engine options as currently set in Preferences. */
export function dbOptionsFromSettings(settings: SettingsStore): DbOptions {
  const s = settings.getAll()
  return {
    foreignKeys: s['db/foreignkeys'],
    disableRegex: s['extensions/disableregex'],
    defaultSqlText: s['db/defaultsqltext'],
    defaultEncoding: s['db/defaultencoding'],
    extensions: s['extensions/list'],
    identifierQuotes: s['editor/identifier_quotes'],
  }
}
