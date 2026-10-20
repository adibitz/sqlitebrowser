import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLOSED_DB_STATE } from '@shared/types/db'
import { describeTab } from '@/features/mcp/describeTab'
import { runUiAction } from '@/features/mcp/uiActions'
import { uiSnapshot } from '@/features/mcp/uiSnapshot'
import { useDbStore } from '@/store/db'
import { useTabsStore, type DocTab } from '@/store/tabs'

// The stores reach main through window.api, which the preload script provides in the app.
vi.hoisted(() => {
  ;(globalThis as { window?: unknown }).window = { api: {} }
})

const customers = { schema: 'main', name: 'customers' }

beforeEach(() => {
  useTabsStore.setState({ tabs: [], activeId: null })
  useDbStore.setState({ state: { ...CLOSED_DB_STATE, isOpen: true } })
})

describe('UI actions', () => {
  it('opens a table with the given filters, search and sort, starting on its first page', async () => {
    useTabsStore.getState().openTable(customers)
    useTabsStore.getState().updateBrowse('table:main.customers', { page: 4, filters: { old: 'x' } })
    useTabsStore.getState().openSql()

    await runUiAction({
      kind: 'openTable',
      table: customers,
      filters: { country: '=IN' },
      search: 'a',
      sort: [{ column: 'name', direction: 'desc' }],
    })
    const { tabs, activeId } = useTabsStore.getState()
    expect(activeId).toBe('table:main.customers')
    expect(tabs.filter((t) => t.kind === 'table')).toHaveLength(1)
    expect(tabs.find((t) => t.id === activeId)).toMatchObject({
      view: 'data',
      browse: {
        filters: { country: '=IN' },
        globalFilter: 'a',
        sort: [{ column: 'name', direction: 'desc' }],
        page: 0,
      },
    })
  })

  it('opens the SQL editor, running it only when a database is open', async () => {
    await runUiAction({ kind: 'openSql', sql: 'SELECT 1', run: true })
    expect(useTabsStore.getState().tabs.at(-1)).toMatchObject({
      kind: 'sql',
      text: 'SELECT 1',
      autoRun: 'run',
    })

    useDbStore.setState({ state: CLOSED_DB_STATE })
    await runUiAction({ kind: 'openSql', sql: 'SELECT 2', run: true })
    expect(useTabsStore.getState().tabs.at(-1)).not.toHaveProperty('autoRun')
  })
})

describe('UI snapshot', () => {
  it('lists the tabs with titles and descriptions', () => {
    useTabsStore.getState().openTable(customers)
    const { tabs, activeId } = useTabsStore.getState()
    expect(uiSnapshot(tabs, activeId)).toEqual({
      tabs: [
        {
          id: 'table:main.customers',
          kind: 'table',
          title: 'customers',
          description: 'the data of table customers',
        },
      ],
      activeTabId: 'table:main.customers',
    })
  })

  it('describes the active tab', () => {
    const table = {
      id: 'table:main.customers',
      kind: 'table',
      object: customers,
      view: 'data',
      browse: {
        filters: { country: '=IN' },
        globalFilter: 'a',
        sort: [{ column: 'name', direction: 'desc' }],
      },
    } as unknown as DocTab
    expect(describeTab(table)).toBe(
      'the data of table customers (country = IN; searching "a"; sorted by name desc)',
    )
    const sql = {
      id: 'sql:1',
      kind: 'sql',
      name: 'SQL 1',
      text: 'SELECT 1;',
      path: null,
      savedText: '',
    } as DocTab
    expect(describeTab(sql)).toBe('the SQL editor "SQL 1" containing:\nSELECT 1;')
    expect(describeTab(undefined)).toBeNull()
  })
})
