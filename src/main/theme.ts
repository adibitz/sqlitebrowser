import { nativeTheme } from 'electron'
import type { Theme } from '@shared/settings/schema'

// Canvas colours from DESIGN.md (colors.canvas / colors.dark-canvas), so the window never flashes white.
const CANVAS_LIGHT = '#F5F5F3'
const CANVAS_DARK = '#0E0E0D'

/** Drives `prefers-color-scheme` in the renderer and the native window chrome. */
export function applyTheme(theme: Theme): void {
  nativeTheme.themeSource = theme
}

export function windowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? CANVAS_DARK : CANVAS_LIGHT
}
