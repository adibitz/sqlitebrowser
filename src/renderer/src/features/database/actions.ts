// Database lifecycle actions shared by the toolbar, start page, command palette and shortcuts.
// Port of MainWindow.open_database / new_database / write_changes / revert_changes / … .
import { toast } from 'sonner'
import type { DbState } from '@shared/types/db'
import { api } from '@/lib/api'
import { confirm, prompt } from '@/store/dialogs'
import { useDbStore } from '@/store/db'
import { useProjectStore } from '@/store/project'
import { useTabsStore } from '@/store/tabs'
import { fileName } from './fileName'
import { openProject } from '@/features/project/projectActions'
import { isProjectFile } from '@shared/project/sqbpro'
import { settlePendingChanges } from './pendingChanges'
import { editTable } from './schemaActions'

/** After a database opened: fresh tabs, the Database Info tab (like upstream), recent list updated. */
function opened(state: DbState): void {
  // The pushed state event may still be on its way; follow-up actions need the new state now.
  useDbStore.getState().setState(state)
  useProjectStore.getState().setPath(null)
  const tabs = useTabsStore.getState()
  tabs.closeForDatabase()
  tabs.openInfo()
  void useDbStore.getState().refreshRecent()
  toast.success(`Opened ${fileName(state.path)}${state.readOnly ? ' (read-only)' : ''}`)
}

/** Opens a database (or a .sqbpro project); resolves true when it opened. */
export async function openDatabaseAt(path: string, readOnly = false): Promise<boolean> {
  if (isProjectFile(path)) return openProject(path)
  if (!(await settlePendingChanges())) return false
  const state = await useDbStore
    .getState()
    .run(`Opening ${fileName(path)}`, () => api.db.open({ path, readOnly }))
  if (state) opened(state)
  else void useDbStore.getState().refreshRecent()
  return !!state
}

export async function openDatabaseFromDialog(readOnly = false): Promise<void> {
  const path = await api.files.showOpenDatabase({
    title: readOnly ? 'Open database read-only' : 'Open database',
  })
  if (path) await openDatabaseAt(path, readOnly)
}

/** `startWithTable`: open the Create Table dialog afterwards, like upstream (not for imports). */
export async function createDatabase({ startWithTable = true } = {}): Promise<void> {
  if (!(await settlePendingChanges())) return
  const path = await api.files.showSaveDatabase({ title: 'Create new database', defaultName: 'database.db' })
  if (!path) return
  const state = await useDbStore.getState().run(`Creating ${fileName(path)}`, () => api.db.create({ path }))
  if (!state) return
  opened(state)
  if (startWithTable) await editTable(null)
}

export async function openMemoryDatabase(): Promise<void> {
  if (!(await settlePendingChanges())) return
  const state = await useDbStore.getState().run('Creating an in-memory database', () => api.db.openMemory())
  if (state) opened(state)
}

export async function closeDatabase(): Promise<void> {
  if (!(await settlePendingChanges())) return
  const state = await useDbStore.getState().run('Closing the database', () => api.db.close())
  if (!state) return
  useTabsStore.getState().closeForDatabase()
  useProjectStore.getState().setPath(null)
}

export async function writeChanges(): Promise<void> {
  const state = await useDbStore.getState().run('Writing changes', () => api.db.write())
  if (state) toast.success('All changes written to disk')
}

export async function revertChanges(): Promise<void> {
  if (!useDbStore.getState().state.dirty) return
  const choice = await confirm({
    title: 'Revert all changes?',
    description: 'Every change since the last write will be undone. This cannot be reversed.',
    actions: [{ id: 'revert', label: 'Revert', variant: 'destructive' }],
  })
  if (choice !== 'revert') return
  const state = await useDbStore.getState().run('Reverting changes', () => api.db.revert())
  if (state) {
    useTabsStore.getState().pruneMissing(state.schemata)
    useDbStore.getState().bumpDataVersion()
    toast.success('Changes reverted')
  }
}

export async function saveDatabaseAs(): Promise<void> {
  const { state } = useDbStore.getState()
  if (state.dirty) {
    const choice = await confirm({
      title: 'Write pending changes first?',
      description: 'The copy includes every change, so they are written to the current file before saving.',
      actions: [{ id: 'continue', label: 'Continue' }],
    })
    if (choice !== 'continue') return
  }
  const path = await api.files.showSaveDatabase({ title: 'Save database as' })
  if (!path) return
  const result = await useDbStore.getState().run(`Saving as ${fileName(path)}`, () => api.db.saveAs({ path }))
  if (result) {
    void useDbStore.getState().refreshRecent()
    toast.success(`Saved as ${fileName(path)}`)
  }
}

export async function attachDatabase(): Promise<void> {
  const path = await api.files.showOpenDatabase({ title: 'Attach database' })
  if (!path) return
  const name = await prompt({
    title: 'Attach database',
    description: 'Queries refer to its tables as name.table.',
    label: 'Name',
    initialValue: fileName(path).replace(/\.[^.]+$/, ''),
    confirmLabel: 'Attach',
  })
  if (!name) return
  const state = await useDbStore
    .getState()
    .run(`Attaching ${fileName(path)}`, () => api.db.attach({ path, name }))
  if (state) toast.success(`Attached as ${name}`)
}

export async function refreshSchema(): Promise<void> {
  const state = await useDbStore.getState().run('Reading the schema', () => api.db.refreshSchema())
  if (state) {
    useTabsStore.getState().pruneMissing(state.schemata)
    useDbStore.getState().bumpDataVersion()
  }
}

export async function revealDatabase(): Promise<void> {
  const { path } = useDbStore.getState().state
  await useDbStore.getState().run('Opening the folder', () => api.files.revealInFolder({ path }))
}

export async function clearRecentFiles(): Promise<void> {
  await useDbStore.getState().run('Clearing recent files', () => api.files.clearRecent())
  await useDbStore.getState().refreshRecent()
}
