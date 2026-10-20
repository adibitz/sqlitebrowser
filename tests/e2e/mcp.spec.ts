// Claude Code's side: an MCP client over HTTP drives the app. Edits stay uncommitted and Revert undoes
// them; writing to disk asks the user (plan: MCP server for Claude Code).
/// <reference lib="dom" />
import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { stubMessageBoxByLabel } from './dialogs'
import { launchApp } from './launch'
import { demoDbPath, finishOnboarding, launchWithDatabase, quitDiscarding } from './steps'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

/** Turns the server on in Preferences and returns the command "Copy Claude Code command" copies. */
async function turnOnMcp(app: ElectronApplication, page: Page, port: number): Promise<string> {
  // Keep the test off the real clipboard.
  await app.evaluate(({ clipboard }) => {
    const copied = globalThis as { copiedText?: string }
    clipboard.writeText = async (text: string) => {
      copied.copiedText = text
    }
  })
  await page.keyboard.press('Control+,')
  const prefs = page.getByRole('dialog', { name: 'Preferences' })
  await prefs.getByRole('button', { name: 'Claude Code (MCP)' }).click()
  await expect(prefs.getByRole('button', { name: 'Copy Claude Code command' })).toBeDisabled()
  await prefs.getByRole('checkbox', { name: 'Let Claude Code control SQliteView' }).click()
  await prefs.getByLabel('Port').fill(String(port))
  await prefs.getByRole('button', { name: 'Save' }).click()
  await expect(prefs).toBeHidden()

  await page.keyboard.press('Control+,')
  await prefs.getByRole('button', { name: 'Claude Code (MCP)' }).click()
  await expect(prefs.getByRole('status', { name: 'MCP server status' })).toHaveText(
    `Running at http://127.0.0.1:${port}/mcp`,
  )
  await prefs.getByRole('button', { name: 'Copy Claude Code command' }).click()
  await prefs.getByRole('button', { name: 'Cancel' }).click()
  return app.evaluate(() => (globalThis as { copiedText?: string }).copiedText ?? '')
}

async function connect(command: string): Promise<(name: string, args?: object) => Promise<unknown>> {
  const [, url, token] = /(http:\/\/\S+) --header "Authorization: Bearer ([\w-]+)"/.exec(command)!
  const client = new Client({ name: 'e2e', version: '1.0.0' })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url!), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  )
  return async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args as Record<string, unknown> })
    const text = (result.content as { text: string }[])[0]!.text
    if (result.isError) throw new Error(text)
    return JSON.parse(text)
  }
}

test('Claude Code browses, edits, reverts and writes through MCP', async () => {
  const { app, page } = await launchWithDatabase()
  const port = await freePort()
  const command = await turnOnMcp(app, page, port)
  expect(command).toMatch(
    new RegExp(
      `^claude mcp add --transport http --scope user sqliteview http://127\\.0\\.0\\.1:${port}/mcp --header "Authorization: Bearer [\\w-]{43}"$`,
    ),
  )
  const call = await connect(command)

  // The window follows: a table with a filter, then the data an edit changed.
  expect(await call('open_table', { table: 'customers', filters: { country: '=IN' } })).toMatchObject({
    matchingRows: expect.any(Number),
  })
  await expect(page.getByRole('tab', { name: 'customers' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Filter country' })).toHaveValue('=IN')
  await expect(page.getByText(/of \d+ \(filtered\)/)).toBeVisible()
  expect(await call('get_app_state')).toMatchObject({
    database: { uncommittedChanges: false },
    activeTabId: 'table:main.customers',
  })

  await call('open_table', { table: 'customers' })
  await expect(page.getByText('Showing 1–100 of 500')).toBeVisible()
  expect(await call('run_sql', { sql: "INSERT INTO customers(name) VALUES ('Zed')" })).toMatchObject({
    changes: 1,
  })
  await expect(page.getByText('Uncommitted changes')).toBeVisible()
  await expect(page.getByText('Showing 1–100 of 501')).toBeVisible()

  await call('revert_changes')
  await expect(page.getByText('Uncommitted changes')).toHaveCount(0)
  await expect(page.getByText('Showing 1–100 of 500')).toBeVisible()

  // Writing to disk asks the user; keeping the changes uncommitted is the safe answer.
  await call('run_sql', { sql: "INSERT INTO customers(name) VALUES ('Zed')" })
  await stubMessageBoxByLabel(app, ['Keep uncommitted'])
  await expect(call('write_changes')).rejects.toThrow('chose not to write')
  await expect(page.getByText('Uncommitted changes')).toBeVisible()
  await stubMessageBoxByLabel(app, ['Write changes'])
  expect(await call('write_changes')).toEqual({ written: true })
  await expect(page.getByText('Uncommitted changes')).toHaveCount(0)

  // SQL the user can see run.
  await call('open_sql_editor', { sql: 'SELECT name FROM customers ORDER BY id DESC LIMIT 1', run: true })
  await expect(page.getByText('1 row · 1 column')).toBeVisible()
  await expect(page.getByRole('gridcell', { name: 'Zed' })).toBeVisible()
  await quitDiscarding(app)
})

test('Claude Code opens a database when none is open', async () => {
  const { app, page } = await launchApp()
  await finishOnboarding(page)
  const call = await connect(await turnOnMcp(app, page, await freePort()))
  expect(await call('get_app_state')).toMatchObject({ database: null })

  const dbPath = demoDbPath(10)
  await call('open_database', { path: dbPath })
  await expect(page.getByRole('tree', { name: 'Database objects' })).toBeVisible()
  expect(await call('get_app_state')).toMatchObject({ database: { path: dbPath, readOnly: false } })
  await expect(call('open_database', { path: `${dbPath}.missing` })).rejects.toThrow("doesn't exist")
  await app.close()
})
