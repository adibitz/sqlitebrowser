// Import and export actions shared by the toolbar, explorer, table tabs, palette and file drop.
// Port of MainWindow.import_csv / import_sql / export_data / export_sql.
import { toast } from 'sonner'
import type { ExportSource } from '@shared/ipc/io'
import type { ObjectRef } from '@shared/types/schema'
import { createDatabase, openMemoryDatabase } from '@/features/database/actions'
import { api } from '@/lib/api'
import { useDbStore } from '@/store/db'
import { confirm } from '@/store/dialogs'
import { useModalStore } from '@/store/modals'

async function ensureDatabaseFor(what: string): Promise<boolean> {
  if (useDbStore.getState().state.isOpen) return true
  const choice = await confirm({
    title: `Where should the ${what} go?`,
    description: 'No database is open. Create a new database file, or use a temporary in-memory database.',
    actions: [
      { id: 'memory', label: 'In memory', variant: 'secondary' },
      { id: 'file', label: 'New database file' },
    ],
  })
  if (choice === 'file') await createDatabase({ startWithTable: false })
  else if (choice === 'memory') await openMemoryDatabase()
  return useDbStore.getState().state.isOpen
}

function writable(): boolean {
  if (!useDbStore.getState().state.readOnly) return true
  toast.info('The database is opened read-only.')
  return false
}

/** Opens the CSV import for `paths`, or asks for files first. */
export async function importCsv(paths?: string[]): Promise<void> {
  if (!(await ensureDatabaseFor('import'))) return
  if (!writable()) return
  const files = paths?.length ? paths : await api.io.chooseCsvFiles()
  if (files.length) useModalStore.getState().show({ kind: 'importCsv', paths: files })
}

export async function importSql(path?: string): Promise<void> {
  const file = path ?? (await api.io.chooseSqlFile())
  if (!file) return
  const { state } = useDbStore.getState()
  if (state.isOpen) {
    if (!writable()) return
    const hasTables = state.schemata.some(
      (s) => s.name === 'main' && s.tables.some((t) => t.kind !== 'system'),
    )
    if (hasTables) {
      const choice = await confirm({
        title: 'Import the SQL into this database?',
        description: 'Objects that already exist with the same names may cause errors.',
        actions: [{ id: 'import', label: 'Import' }],
      })
      if (choice !== 'import') return
    }
  } else if (!(await ensureDatabaseFor('imported SQL'))) return
  const done = await useDbStore.getState().run('Importing SQL', async () => {
    await api.io.importSql({ path: file })
    return true
  })
  if (done) {
    useDbStore.getState().bumpDataVersion()
    toast.success('SQL imported. Write changes to keep it.')
  }
}

/** Export one source, or let the user choose tables and views (`selected` preselects one). */
export function exportData(source: ExportSource | null = null, selected: ObjectRef | null = null): void {
  if (useDbStore.getState().state.isOpen)
    useModalStore.getState().show({ kind: 'exportData', source, selected })
}

export function exportSql(): void {
  if (useDbStore.getState().state.isOpen) useModalStore.getState().show({ kind: 'exportSql' })
}
