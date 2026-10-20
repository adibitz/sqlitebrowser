import { toast } from 'sonner'
import { create } from 'zustand'
import { CLOSED_DB_STATE, type DbState } from '@shared/types/db'
import type { RecentFile } from '@shared/types/files'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useLogStore } from './log'

interface DbStore {
  state: DbState
  recent: RecentFile[]
  /** SQLite library version of the DB worker ('' until known). */
  sqliteVersion: string
  /** What the app is waiting for, e.g. "Opening customers.db"; null when idle. */
  busy: string | null
  /** Bumped whenever table data may have changed outside the grid (revert, refresh, executed SQL). */
  dataVersion: number
  bumpDataVersion(): void
  setState(state: DbState): void
  refreshRecent(): Promise<void>
  /** Runs an api call with a busy label; errors become an error toast and resolve to null. */
  run<T>(label: string, fn: () => Promise<T>): Promise<T | null>
}

export const useDbStore = create<DbStore>()((set) => ({
  state: CLOSED_DB_STATE,
  recent: [],
  sqliteVersion: '',
  busy: null,
  dataVersion: 0,

  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  setState: (state) => set({ state }),

  async refreshRecent() {
    try {
      set({ recent: await api.files.recent() })
    } catch (err) {
      toast.error(`Couldn't read the recent files: ${errorMessage(err)}`)
    }
  },

  async run(label, fn) {
    set({ busy: label })
    try {
      return await fn()
    } catch (err) {
      toast.error(errorMessage(err))
      return null
    } finally {
      set({ busy: null })
    }
  },
}))

/** Subscribes to state pushed from main and loads the initial state. Returns the unsubscribe. */
export function connectDbStore(): () => void {
  const { setState, refreshRecent } = useDbStore.getState()
  const offState = api.db.onState(setState)
  const offLog = api.db.onLog((entries) => useLogStore.getState().append(entries))
  const offWarning = api.db.onWarning((message) => toast.warning(message, { duration: 10_000 }))
  void api.db.getState().then(setState)
  void api.db.sqliteVersion().then((sqliteVersion) => useDbStore.setState({ sqliteVersion }))
  void refreshRecent()
  return () => {
    offState()
    offLog()
    offWarning()
  }
}
