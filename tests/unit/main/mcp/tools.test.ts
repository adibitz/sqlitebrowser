// The MCP tools through a real MCP client (in memory) on a real database, with a stand-in window.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { CLOSED_DB_STATE, type DbState } from '@shared/types/db'
import type { UiAction, UiSnapshot } from '@shared/types/mcp'
import { querySingleValue } from '../../../../src/main/core/db/execute'
import { releaseAllSavepoints, revertAll } from '../../../../src/main/core/db/savepoints'
import { isDirty, type DbSession } from '../../../../src/main/core/db/session'
import { describeTable, listTables, runQuery, runSql, sampleRows } from '../../../../src/main/core/mcpTools'
import { countRows } from '../../../../src/main/core/rows'
import { buildMcpServer } from '../../../../src/main/mcp/buildServer'
import type { McpDatabase, McpHost } from '../../../../src/main/mcp/tools/index'
import { makeDbFile, openCoreTestDb } from '../../../fixtures/coreTestDb'

function sessionDatabase(db: DbSession): McpDatabase {
  const state = (): DbState => ({ ...CLOSED_DB_STATE, isOpen: true, dirty: isDirty(db) })
  return {
    listTables: async () => listTables(db),
    describeTable: async (ref) => describeTable(db, ref),
    sampleRows: async (ref, limit) => sampleRows(db, ref, limit),
    runQuery: async (sql) => runQuery(db, sql),
    runSql: async (sql) => runSql(db, sql),
    countRows: async (query) => countRows(db, query),
    write: async () => (releaseAllSavepoints(db), state()),
    revert: async () => (revertAll(db), state()),
  }
}

async function setup({ confirm = true, open = true } = {}) {
  const db = openCoreTestDb()
  const actions: UiAction[] = []
  let dataChanges = 0
  const snapshot: UiSnapshot = {
    tabs: [{ id: 'info', kind: 'info', title: 'Database info', description: 'the Database info tab' }],
    activeTabId: 'info',
  }
  const host: McpHost = {
    dbState: () => ({ ...CLOSED_DB_STATE, isOpen: open, path: 'C:/data/demo.db', dirty: isDirty(db) }),
    uiSnapshot: () => snapshot,
    ui: async (action) => void actions.push(action),
    confirmWrite: async () => confirm,
    dataChanged: () => void dataChanges++,
    filterEscape: () => '\\',
  }
  const server = buildMcpServer(sessionDatabase(db), host, '1.0.0')
  const client = new Client({ name: 'test', version: '1.0.0' })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverSide), client.connect(clientSide)])

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args })
    const text = (result.content as { type: string; text: string }[])[0]!.text
    return { isError: result.isError === true, text, json: () => JSON.parse(text) as unknown }
  }
  return { db, actions, call, client, dataChanges: () => dataChanges }
}

const count = (db: DbSession, sql: string): bigint => querySingleValue(db, sql) as bigint

describe('MCP tools', () => {
  it('offers every tool', async () => {
    const t = await setup()
    const { tools } = await t.client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual([
      'get_app_state',
      'list_tables',
      'describe_table',
      'sample_rows',
      'run_query',
      'run_sql',
      'revert_changes',
      'write_changes',
      'open_database',
      'open_table',
      'open_sql_editor',
    ])
  })

  it('tells the client to show rows in the window', async () => {
    const t = await setup()
    const instructions = t.client.getInstructions() ?? ''
    expect(instructions).toContain('open_table')
    expect(instructions).toContain('open_sql_editor')
  })

  it('reports the app state', async () => {
    const t = await setup()
    expect((await t.call('get_app_state')).json()).toEqual({
      database: { path: 'C:/data/demo.db', readOnly: false, uncommittedChanges: false },
      tabs: [{ id: 'info', kind: 'info', title: 'Database info', description: 'the Database info tab' }],
      activeTabId: 'info',
    })
  })

  it('reads through the tools', async () => {
    const t = await setup()
    expect((await t.call('list_tables')).json()).toContainEqual({
      schema: 'main',
      name: 'parent',
      kind: 'table',
      columns: ['id', 'name'],
    })
    expect((await t.call('run_query', { sql: 'SELECT count(*) AS n FROM parent' })).json()).toEqual({
      columns: ['n'],
      rows: [[3]],
      total: 1,
      truncated: false,
    })
    expect((await t.call('describe_table', { table: 'PARENT' })).json()).toMatchObject({ rowCount: 3 })
  })

  it('refuses writes in run_query', async () => {
    const t = await setup()
    const result = await t.call('run_query', { sql: 'DELETE FROM parent' })
    expect(result).toMatchObject({
      isError: true,
      text: expect.stringContaining('only runs statements that read'),
    })
    expect(count(t.db, 'SELECT count(*) FROM parent')).toBe(3n)
  })

  it('runs run_sql at once as an uncommitted change that revert_changes undoes', async () => {
    const t = await setup()
    expect(
      (await t.call('run_sql', { sql: "INSERT INTO parent(name) VALUES ('dora')" })).json(),
    ).toMatchObject({
      changes: 1,
    })
    expect(isDirty(t.db)).toBe(true)
    expect(t.dataChanges()).toBe(1)
    expect((await t.call('revert_changes')).json()).toEqual({ reverted: true })
    expect(count(t.db, 'SELECT count(*) FROM parent')).toBe(3n)
    expect(t.dataChanges()).toBe(2)
    expect((await t.call('revert_changes')).json()).toMatchObject({ reverted: false })
  })

  it('writes changes only when the user agrees', async () => {
    const kept = await setup({ confirm: false })
    await kept.call('run_sql', { sql: 'DELETE FROM parent' })
    expect(await kept.call('write_changes')).toMatchObject({
      isError: true,
      text: expect.stringContaining('chose not to write'),
    })
    expect(isDirty(kept.db)).toBe(true)

    const written = await setup({ confirm: true })
    await written.call('run_sql', { sql: 'DELETE FROM parent' })
    expect((await written.call('write_changes')).json()).toEqual({ written: true })
    expect(isDirty(written.db)).toBe(false)
  })

  it('opens a table with filters after checking them', async () => {
    const t = await setup()
    const result = await t.call('open_table', {
      table: 'parent',
      filters: { name: 'a' },
      sort: [{ column: 'name', direction: 'desc' }],
    })
    expect(result.json()).toEqual({ table: { schema: 'main', name: 'parent' }, matchingRows: 2 })
    expect(t.actions).toEqual([
      {
        kind: 'openTable',
        table: { schema: 'main', name: 'parent' },
        filters: { name: 'a' },
        search: '',
        sort: [{ column: 'name', direction: 'desc' }],
      },
    ])
    expect((await t.call('open_table', { table: 'nope' })).isError).toBe(true)
    expect(t.actions).toHaveLength(1)
  })

  it('opens a database file only when it exists', async () => {
    const t = await setup()
    const file = makeDbFile('CREATE TABLE t(a)', 'other.db')
    expect((await t.call('open_database', { path: file })).isError).toBe(false)
    expect(t.actions).toEqual([{ kind: 'openDatabase', path: file, readOnly: false }])
    expect((await t.call('open_database', { path: file + '.missing' })).isError).toBe(true)
    expect((await t.call('open_database', { path: 'relative.db' })).isError).toBe(true)
    expect(t.actions).toHaveLength(1)
  })

  it('opens the SQL editor, and asks for a database before running', async () => {
    const t = await setup({ open: false })
    expect((await t.call('open_sql_editor', { sql: 'SELECT 1' })).json()).toEqual({
      opened: true,
      ran: false,
    })
    expect(await t.call('open_sql_editor', { sql: 'SELECT 1', run: true })).toMatchObject({
      isError: true,
      text: expect.stringContaining('No database is open'),
    })
    expect(t.actions).toEqual([{ kind: 'openSql', sql: 'SELECT 1', run: false }])
  })
})
