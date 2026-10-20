// Structure actions shared by the explorer, table tabs, command palette and shortcuts.
// Port of MainWindow.edit_table / create_index / drop_object / add_record_dialog / open_info_tab.
import { toast } from 'sonner'
import type { DroppableKind } from '@shared/ipc/schema'
import { objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { api } from '@/lib/api'
import { useDbStore } from '@/store/db'
import { confirm } from '@/store/dialogs'
import { useModalStore } from '@/store/modals'
import { useTabsStore } from '@/store/tabs'

function canChangeStructure(): boolean {
  const { state } = useDbStore.getState()
  if (!state.isOpen) return false
  if (state.readOnly) {
    toast.info('The database is opened read-only.')
    return false
  }
  return true
}

/** Opens the table dialog: `ref` to modify a table, null to create one. */
export async function editTable(ref: ObjectRef | null): Promise<void> {
  if (!canChangeStructure()) return
  let commitConfirmed = false
  // With foreign keys enforced the table is rebuilt outside a transaction (upstream asks first).
  if (ref && useDbStore.getState().state.dirty) {
    const info = await useDbStore.getState().run('Reading pragmas', () => api.schema.info())
    if (!info) return
    if (String(info.pragmas.foreign_keys) === '1') {
      const choice = await confirm({
        title: 'Write pending changes?',
        description:
          'Foreign keys are enforced, so editing the table writes all pending changes to the file first.',
        actions: [{ id: 'write', label: 'Write changes' }],
      })
      if (choice !== 'write') return
      commitConfirmed = true
    }
  }
  useModalStore.getState().show({ kind: 'editTable', ref, commitConfirmed })
}

export function createIndex(table: ObjectRef | null): void {
  if (canChangeStructure()) useModalStore.getState().show({ kind: 'createIndex', table })
}

export function insertRecord(ref: ObjectRef): void {
  if (canChangeStructure()) useModalStore.getState().show({ kind: 'insertRecord', ref })
}

export async function dropObject(kind: DroppableKind, ref: ObjectRef): Promise<void> {
  if (!canChangeStructure()) return
  const name = objectDisplayName(ref)
  const choice = await confirm({
    title: `Delete the ${kind} ${name}?`,
    description: 'Everything in it will be lost, until you revert changes.',
    actions: [{ id: 'delete', label: `Delete ${kind}`, variant: 'destructive' }],
  })
  if (choice !== 'delete') return
  const done = await useDbStore.getState().run(`Deleting ${name}`, async () => {
    await api.schema.drop({ kind, ref })
    return true
  })
  if (done) toast.success(`Deleted ${kind} ${name}`)
}

export function openDatabaseInfo(): void {
  if (useDbStore.getState().state.isOpen) useTabsStore.getState().openInfo()
}
