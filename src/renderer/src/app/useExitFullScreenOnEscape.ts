import { useEffect } from 'react'
import { useUiStore } from '@/store/ui'

/** Esc leaves full-screen mode (unless something else, like a dialog, handled the key). */
export function useExitFullScreenOnEscape(): void {
  const fullScreen = useUiStore((s) => s.fullScreen)
  useEffect(() => {
    if (!fullScreen) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) useUiStore.getState().setFullScreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullScreen])
}
