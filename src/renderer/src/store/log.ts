import { create } from 'zustand'
import type { LogEntry } from '@shared/types/db'

/** Entries kept for the SQL log panel (older ones drop off, like the Python panel's block limit). */
export const MAX_LOG_ENTRIES = 5000

interface LogStore {
  entries: LogEntry[]
  append(entries: LogEntry[]): void
  clear(): void
}

export const useLogStore = create<LogStore>()((set) => ({
  entries: [],
  append: (entries) => set((s) => ({ entries: [...s.entries, ...entries].slice(-MAX_LOG_ENTRIES) })),
  clear: () => set({ entries: [] }),
}))
