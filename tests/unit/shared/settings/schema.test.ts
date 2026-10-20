import { describe, expect, it } from 'vitest'
import { parseSetting, SETTING_KEYS, settingsWithDefaults } from '@shared/settings/schema'

describe('settings schema', () => {
  it('has a default for every key', () => {
    const defaults = settingsWithDefaults({})
    for (const key of SETTING_KEYS) expect(defaults).toHaveProperty([key])
  })

  it('keeps valid stored values and replaces invalid ones', () => {
    const merged = settingsWithDefaults({ 'General/theme': 'dark', 'editor/tabsize': 'four' })
    expect(merged['General/theme']).toBe('dark')
    expect(merged['editor/tabsize']).toBe(4)
  })

  it('validates window bounds', () => {
    expect(
      parseSetting('MainWindow/bounds', { x: 0, y: 0, width: 800, height: 600, maximized: false }),
    ).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      maximized: false,
    })
    expect(() =>
      parseSetting('MainWindow/bounds', { x: 0, y: 0, width: 10, height: 10, maximized: false }),
    ).toThrow()
  })
})
