import { useEffect } from 'react'
import type { Theme } from '@shared/settings/schema'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Keeps `.dark` on <html> in sync with the 'General/theme' setting. Light and Dark are applied directly;
 * System follows the OS colour scheme and updates live when it changes.
 */
export function useThemeClass(theme: Theme | undefined): void {
  useEffect(() => {
    if (!theme) return
    const query = window.matchMedia(DARK_QUERY)
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && query.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme])
}
