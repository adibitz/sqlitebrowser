import { create } from 'zustand'
import type { CondFormat } from '@shared/format/condFormat'
import type { SortSpec } from '@shared/types/rows'
import { sameObject, type ObjectRef, type SchemaInfo } from '@shared/types/schema'
import { useSettingsStore } from './settings'

export type TableView = 'data' | 'structure' | 'sql'

/** Everything about how one table is browsed; kept while its tab is open (and saved in projects). */
export interface BrowseState {
  filters: Record<string, string>
  globalFilter: string
  sort: SortSpec[]
  /** Rows per page; 0 = one scrolling list. */
  pageSize: number
  page: number
  hiddenColumns: string[]
  columnWidths: Record<string, number>
  /** Key columns chosen to edit a view. */
  pseudoPk: string[]
  /** Click selects whole rows instead of cells. */
  rowSelection: boolean
  /** column -> SQL expression shown instead of the value. */
  displayFormats: Record<string, string>
  /** column -> colouring rules, first match wins. */
  condFormats: Record<string, CondFormat[]>
}

export type DocTab =
  | { id: string; kind: 'table'; object: ObjectRef; view: TableView; browse: BrowseState }
  | { id: string; kind: 'schema'; object: ObjectRef | null }
  | { id: string; kind: 'info'; object?: undefined }
  | {
      id: string
      kind: 'sql'
      /** "SQL 1", or the file name once saved. */
      name: string
      path: string | null
      text: string
      /** Text as last saved or opened; differs from `text` while there are unsaved edits. */
      savedText: string
      /** Run the editor once it is shown (command line --sql), and quit afterwards with 'runAndQuit'. */
      autoRun?: 'run' | 'runAndQuit'
      object?: undefined
    }

export type SqlTab = Extract<DocTab, { kind: 'sql' }>

/** Unsaved SQL: edited since the last save, and not empty. */
export function isSqlModified(tab: SqlTab): boolean {
  return tab.text !== tab.savedText && tab.text.trim() !== ''
}

interface TabsStore {
  tabs: DocTab[]
  activeId: string | null
  openTable(object: ObjectRef, view?: TableView): void
  setTableView(id: string, view: TableView): void
  updateBrowse(id: string, patch: Partial<BrowseState>): void
  openSchema(object: ObjectRef | null): void
  /** The Database Info & Pragmas tab (one at most). */
  openInfo(): void
  /** New SQL editor tab; returns its id. */
  /** `clean`: the text counts as saved (SQL restored from a project). */
  openSql(init?: {
    text?: string
    path?: string | null
    name?: string
    clean?: boolean
    autoRun?: 'run' | 'runAndQuit'
  }): string
  /** The auto run has started. */
  clearAutoRun(id: string): void
  setSqlText(id: string, text: string): void
  markSqlSaved(id: string, path: string, name: string, text: string): void
  activate(id: string): void
  close(id: string): void
  closeAll(): void
  /** When the database closes: keeps SQL tabs with unsaved edits (they don't depend on the database). */
  closeForDatabase(): void
  move(fromIndex: number, toIndex: number): void
  /** Drops table tabs whose object no longer exists (after DROP, rename or revert). */
  pruneMissing(schemata: SchemaInfo[]): void
  /** Points the tabs of a renamed (or moved) table at its new name. */
  retarget(from: ObjectRef, to: ObjectRef): void
}

let sqlCounter = 0

const tableTabId = (o: ObjectRef): string => `table:${o.schema}.${o.name}`
const schemaTabId = (o: ObjectRef | null): string => (o ? `schema:${o.schema}.${o.name}` : 'schema:*')
const INFO_TAB_ID = 'info'

export function newBrowseState(): BrowseState {
  return {
    filters: {},
    globalFilter: '',
    sort: [],
    pageSize: useSettingsStore.getState().settings?.['databrowser/page_size'] ?? 100,
    page: 0,
    hiddenColumns: [],
    columnWidths: {},
    pseudoPk: [],
    rowSelection: false,
    displayFormats: {},
    condFormats: {},
  }
}

function exists(schemata: SchemaInfo[], o: ObjectRef): boolean {
  return schemata.some((s) => s.name === o.schema && s.tables.some((t) => t.name === o.name))
}

/** Which tab to show after `closedId` goes: the one to its right, else to its left. */
function neighbourOf(tabs: DocTab[], closedId: string): string | null {
  const i = tabs.findIndex((t) => t.id === closedId)
  return tabs[i + 1]?.id ?? tabs[i - 1]?.id ?? null
}

function mapTable(
  tabs: DocTab[],
  id: string,
  fn: (t: Extract<DocTab, { kind: 'table' }>) => DocTab,
): DocTab[] {
  return tabs.map((t) => (t.id === id && t.kind === 'table' ? fn(t) : t))
}

export const useTabsStore = create<TabsStore>()((set, get) => ({
  tabs: [],
  activeId: null,

  openTable(object, view = 'data') {
    const id = tableTabId(object)
    if (get().tabs.some((t) => t.id === id)) {
      set({ activeId: id, tabs: mapTable(get().tabs, id, (t) => ({ ...t, view })) })
      return
    }
    set({
      tabs: [...get().tabs, { id, kind: 'table', object, view, browse: newBrowseState() }],
      activeId: id,
    })
  },

  setTableView(id, view) {
    set({ tabs: mapTable(get().tabs, id, (t) => ({ ...t, view })) })
  },

  updateBrowse(id, patch) {
    set({ tabs: mapTable(get().tabs, id, (t) => ({ ...t, browse: { ...t.browse, ...patch } })) })
  },

  openSchema(object) {
    const id = schemaTabId(object)
    if (!get().tabs.some((t) => t.id === id)) set({ tabs: [...get().tabs, { id, kind: 'schema', object }] })
    set({ activeId: id })
  },

  openInfo() {
    if (!get().tabs.some((t) => t.id === INFO_TAB_ID)) {
      set({ tabs: [...get().tabs, { id: INFO_TAB_ID, kind: 'info' }] })
    }
    set({ activeId: INFO_TAB_ID })
  },

  openSql(init = {}) {
    sqlCounter++
    const id = `sql:${sqlCounter}`
    const text = init.text ?? ''
    const tab: DocTab = {
      id,
      kind: 'sql',
      name: init.name ?? `SQL ${sqlCounter}`,
      path: init.path ?? null,
      text,
      savedText: init.path || init.clean ? text : '',
      ...(init.autoRun && { autoRun: init.autoRun }),
    }
    set({ tabs: [...get().tabs, tab], activeId: id })
    return id
  },

  clearAutoRun(id) {
    set({ tabs: get().tabs.map((t) => (t.id === id && t.kind === 'sql' ? { ...t, autoRun: undefined } : t)) })
  },

  setSqlText(id, text) {
    set({ tabs: get().tabs.map((t) => (t.id === id && t.kind === 'sql' ? { ...t, text } : t)) })
  },

  markSqlSaved(id, path, name, text) {
    set({
      tabs: get().tabs.map((t) =>
        t.id === id && t.kind === 'sql' ? { ...t, path, name, savedText: text } : t,
      ),
    })
  },

  activate: (id) => set({ activeId: id }),

  close(id) {
    const { tabs, activeId } = get()
    set({
      tabs: tabs.filter((t) => t.id !== id),
      activeId: activeId === id ? neighbourOf(tabs, id) : activeId,
    })
  },

  closeAll: () => set({ tabs: [], activeId: null }),

  closeForDatabase() {
    const kept = get().tabs.filter((t) => t.kind === 'sql' && isSqlModified(t))
    set({ tabs: kept, activeId: kept.at(-1)?.id ?? null })
  },

  move(fromIndex, toIndex) {
    const tabs = [...get().tabs]
    const [moved] = tabs.splice(fromIndex, 1)
    if (!moved) return
    tabs.splice(toIndex, 0, moved)
    set({ tabs })
  },

  pruneMissing(schemata) {
    const { tabs, activeId } = get()
    const kept = tabs.filter((t) => !t.object || exists(schemata, t.object))
    if (kept.length === tabs.length) return
    const active = kept.some((t) => t.id === activeId) ? activeId : (kept.at(-1)?.id ?? null)
    set({ tabs: kept, activeId: active })
  },

  retarget(from, to) {
    const { tabs, activeId } = get()
    const moved = (id: string): string =>
      id === tableTabId(from) ? tableTabId(to) : id === schemaTabId(from) ? schemaTabId(to) : id
    set({
      tabs: tabs.map((t) =>
        t.object && sameObject(t.object, from) ? { ...t, id: moved(t.id), object: to } : t,
      ),
      activeId: activeId && moved(activeId),
    })
  },
}))
