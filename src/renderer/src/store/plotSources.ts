import { create } from 'zustand'
import type { BrowseQuery } from '@shared/types/rows'
import type { SqlValue } from '@shared/types/values'

/** Rows a grid shows, as the plot reads them. */
export type PlotSource =
  /** A table tab: rows are [key, ...columns, ...format matches]. */
  | { kind: 'browse'; name: string; query: BrowseQuery; columns: string[] }
  /** An SQL result that is read in pages. */
  | { kind: 'sql'; name: string; sql: string; columns: string[] }
  /** An SQL result that came back with its rows (INSERT … RETURNING). */
  | { kind: 'static'; name: string; columns: string[]; rows: SqlValue[][] }

interface PlotSourcesState {
  /** tab id -> what its grid shows. */
  sources: Record<string, PlotSource>
  set(tabId: string, source: PlotSource | null): void
}

export const usePlotSourcesStore = create<PlotSourcesState>()((set) => ({
  sources: {},
  set: (tabId, source) =>
    set((s) => {
      const sources = { ...s.sources }
      if (source) sources[tabId] = source
      else delete sources[tabId]
      return { sources }
    }),
}))
