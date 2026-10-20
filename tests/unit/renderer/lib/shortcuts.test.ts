import { describe, expect, it } from 'vitest'
import { formatShortcut, matchesShortcut } from '@/lib/shortcuts'

const key = (init: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...init,
  }) as KeyboardEvent

describe('shortcuts', () => {
  it('maps Mod to Ctrl on Windows/Linux and ⌘ on macOS', () => {
    expect(matchesShortcut(key({ key: 'o', ctrlKey: true }), 'Mod+O', false)).toBe(true)
    expect(matchesShortcut(key({ key: 'o', metaKey: true }), 'Mod+O', true)).toBe(true)
    expect(matchesShortcut(key({ key: 'o', metaKey: true }), 'Mod+O', false)).toBe(false)
  })

  it('requires the exact modifiers', () => {
    expect(matchesShortcut(key({ key: 'O', ctrlKey: true, shiftKey: true }), 'Mod+O', false)).toBe(false)
    expect(matchesShortcut(key({ key: 'O', ctrlKey: true, shiftKey: true }), 'Mod+Shift+O', false)).toBe(true)
    expect(matchesShortcut(key({ key: 'F4', ctrlKey: true }), 'Mod+F4', false)).toBe(true)
  })

  it('formats for display', () => {
    expect(formatShortcut('Mod+Shift+O', false)).toBe('Ctrl+Shift+O')
    expect(formatShortcut('Mod+Shift+O', true)).toBe('⌘⇧O')
  })
})
