import { basename } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import { MEMORY_DATABASE } from '@shared/types/db'
import type { UnsavedDocuments } from './ipc/app'
import type { DbStateTracker } from './ipc/db'
import type { DbWorker } from './worker/rpc'

export interface CloseGuardDeps {
  tracker: DbStateTracker
  unsaved: UnsavedDocuments
  worker: DbWorker
}

/**
 * Asks before the window closes (port of MainWindow.closeEvent / _confirm_close_db): first about SQL
 * tabs with unsaved edits, then about uncommitted database changes (Save / Discard / Cancel for
 * files, Close / Cancel for an in-memory database).
 */
export function guardCloseWithPendingChanges(
  win: BrowserWindow,
  { tracker, unsaved, worker }: CloseGuardDeps,
): void {
  let confirmed = false

  win.on('close', (event) => {
    if (confirmed) return
    const state = tracker.get()
    const documents = unsaved.get()
    const dirty = state.isOpen && state.dirty
    if (!dirty && !documents.length) return
    event.preventDefault()
    void (async () => {
      if (documents.length && !(await askDocuments(documents))) return
      if (dirty && !(await askDatabase(state.path))) return
      confirmed = true
      win.close()
    })()
  })

  async function askDocuments(names: string[]): Promise<boolean> {
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Close without saving', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message:
        names.length === 1 ? `${names[0]} has unsaved SQL.` : `${names.length} SQL tabs have unsaved edits.`,
      detail: names.length === 1 ? 'Close anyway?' : `${names.join(', ')}\n\nClose anyway?`,
    })
    return response === 0
  }

  async function askDatabase(path: string): Promise<boolean> {
    if (path === MEMORY_DATABASE) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Close', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        message: 'Close this temporary database?',
        detail: 'It only exists in memory, so all of its data will be lost.',
      })
      return response === 0
    }
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: `Save changes to ${basename(path)}?`,
      detail: "Your changes haven't been written to the file yet.",
    })
    if (response === 2) return false
    try {
      await worker.call(response === 0 ? 'db.write' : 'db.revert')
      return true
    } catch (err) {
      dialog.showErrorBox('Writing changes failed', (err as Error).message)
      return false
    }
  }
}
