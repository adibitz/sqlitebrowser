import { beforeEach, describe, expect, it } from 'vitest'
import { openPrefsDb, type PrefsDb } from '../../../../src/main/prefs/database'
import { createSettingsStore, type SettingsStore } from '../../../../src/main/prefs/settings'

describe('settings store', () => {
  let db: PrefsDb
  let store: SettingsStore

  beforeEach(() => {
    db = openPrefsDb(':memory:')
    store = createSettingsStore(db)
  })

  it('returns the Python defaults when nothing is stored', () => {
    const all = store.getAll()
    expect(all['General/theme']).toBe('system')
    expect(all['db/prefetchsize']).toBe(50_000)
    expect(all['databrowser/page_size']).toBe(100)
    expect(all['databrowser/filter_escape']).toBe('\\')
    expect(all['General/onboarded']).toBe(false)
    expect(all['MainWindow/bounds']).toBeNull()
  })

  it('saves and reads back a value', () => {
    store.set('General/theme', 'dark')
    expect(store.get('General/theme')).toBe('dark')
    expect(createSettingsStore(db).get('General/theme')).toBe('dark')
  })

  it('rejects a value that does not fit the key and keeps the old one', () => {
    store.set('General/theme', 'light')
    expect(() => store.set('General/theme', 'purple')).toThrow()
    expect(() => store.set('databrowser/page_size', -1)).toThrow()
    expect(store.get('General/theme')).toBe('light')
  })

  it('falls back to the default for a corrupt stored value', () => {
    db.prepare("INSERT INTO settings (key, value) VALUES ('General/theme', 'not json')").run()
    db.prepare("INSERT INTO settings (key, value) VALUES ('General/uiDensity', '\"huge\"')").run()
    expect(store.get('General/theme')).toBe('system')
    expect(store.get('General/uiDensity')).toBe('comfortable')
  })
})
