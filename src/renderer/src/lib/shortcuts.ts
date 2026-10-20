/**
 * Keyboard shortcuts written as "Mod+Shift+O". Mod is Ctrl on Windows/Linux and ⌘ on macOS.
 * Pure helpers: parsing, matching a KeyboardEvent, and formatting for display.
 */

export const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

interface ParsedShortcut {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parse(shortcut: string): ParsedShortcut {
  const parts = shortcut.split('+')
  const key = parts.pop()!.toLowerCase()
  return { mod: parts.includes('Mod'), shift: parts.includes('Shift'), alt: parts.includes('Alt'), key }
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string, mac = isMac): boolean {
  const s = parse(shortcut)
  const mod = mac ? event.metaKey : event.ctrlKey
  const otherMod = mac ? event.ctrlKey : event.metaKey
  if (s.mod !== mod || otherMod || s.shift !== event.shiftKey || s.alt !== event.altKey) return false
  return event.key.toLowerCase() === s.key || event.code.toLowerCase() === `key${s.key}`
}

const MAC_SYMBOLS: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥' }

/** "Mod+Shift+O" -> "Ctrl+Shift+O" (Windows/Linux) or "⌘⇧O" (macOS). */
export function formatShortcut(shortcut: string, mac = isMac): string {
  const parts = shortcut.split('+')
  if (mac) return parts.map((p) => MAC_SYMBOLS[p] ?? p).join('')
  return parts.map((p) => (p === 'Mod' ? 'Ctrl' : p)).join('+')
}
