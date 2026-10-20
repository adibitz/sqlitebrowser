import { create } from 'zustand'
import type { ExportSource } from '@shared/ipc/io'
import type { ObjectRef } from '@shared/types/schema'

/** The feature dialogs (structure, import, export); one is open at a time. */
export type Modal =
  /** `ref` null creates a table. `commitConfirmed`: the user agreed to write pending changes first. */
  | { kind: 'editTable'; ref: ObjectRef | null; commitConfirmed: boolean }
  | { kind: 'createIndex'; table: ObjectRef | null }
  | { kind: 'insertRecord'; ref: ObjectRef }
  | { kind: 'importCsv'; paths: string[] }
  /** `source` exports that one thing; null lets the user pick tables and views. */
  | { kind: 'exportData'; source: ExportSource | null; selected: ObjectRef | null }
  | { kind: 'exportSql' }
  /** Column formats of the table tab `tabId`. */
  | { kind: 'displayFormat'; tabId: string; table: ObjectRef; column: string }
  | { kind: 'condFormats'; tabId: string; table: ObjectRef; column: string }
  | { kind: 'preferences' }

interface ModalState {
  open: Modal | null
  show(dialog: Modal): void
  close(): void
}

export const useModalStore = create<ModalState>()((set) => ({
  open: null,
  show: (dialog) => set({ open: dialog }),
  close: () => set({ open: null }),
}))
