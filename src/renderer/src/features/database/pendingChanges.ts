import { MEMORY_DATABASE } from '@shared/types/db'
import { api } from '@/lib/api'
import { confirm } from '@/store/dialogs'
import { useDbStore } from '@/store/db'
import { fileName } from './fileName'

/**
 * Before closing or replacing the database: asks what to do with uncommitted changes (port of
 * MainWindow._confirm_close_db). Resolves false when the user cancels or writing fails.
 */
export async function settlePendingChanges(): Promise<boolean> {
  const { state, run } = useDbStore.getState()
  if (!state.isOpen || !state.dirty) return true

  if (state.path === MEMORY_DATABASE) {
    const choice = await confirm({
      title: 'Close this temporary database?',
      description: 'It only exists in memory, so all of its data will be lost.',
      actions: [{ id: 'close', label: 'Close', variant: 'destructive' }],
    })
    return choice === 'close'
  }

  const choice = await confirm({
    title: `Save changes to ${fileName(state.path)}?`,
    description: "Your changes haven't been written to the file yet.",
    actions: [
      { id: 'discard', label: 'Discard', variant: 'secondary' },
      { id: 'save', label: 'Save' },
    ],
  })
  if (choice === null) return false
  const result = await run(choice === 'save' ? 'Writing changes' : 'Discarding changes', () =>
    choice === 'save' ? api.db.write() : api.db.revert(),
  )
  return result !== null
}
