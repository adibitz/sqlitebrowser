import { useEffect } from 'react'
import { matchesShortcut } from '@/lib/shortcuts'
import type { Command } from './commands'

/** Runs the enabled command whose shortcut matches a key press anywhere in the window. */
export function useGlobalShortcuts(commands: Command[]): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.defaultPrevented) return
      const command = commands.find((c) => c.enabled && c.shortcut && matchesShortcut(event, c.shortcut))
      if (!command) return
      event.preventDefault()
      command.run()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commands])
}
