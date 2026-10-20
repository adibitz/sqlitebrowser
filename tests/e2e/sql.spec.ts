// SQL editor: run all / current statement, results, errors, DDL, INSERT … RETURNING, files, log.
/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { stubMessageBox, stubSaveDialog } from './dialogs'
import { launchWithDatabase, quitDiscarding } from './steps'

async function newEditor(page: Page, sql: string): Promise<void> {
  await page.keyboard.press('Control+T')
  const editor = page.getByRole('textbox', { name: 'SQL editor' })
  await editor.click()
  await page.keyboard.insertText(sql)
}

test('runs a query and pages through its results', async () => {
  const { app, page } = await launchWithDatabase()
  await newEditor(page, 'SELECT id, name FROM customers WHERE id <= 300 ORDER BY id;')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('300 rows · 2 columns')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'name' })).toBeVisible()
  await expect(page.locator('[role="row"][aria-rowindex="2"] [role="gridcell"]').first()).toHaveText('1')
  await expect(page.getByRole('list', { name: 'Messages' })).toContainText('Query returned rows')
  await quitDiscarding(app)
})

test('reports the failing statement and keeps earlier changes revertible', async () => {
  const { app, page } = await launchWithDatabase()
  await newEditor(page, "CREATE TABLE notes(t TEXT);\nINSERT INTO notes VALUES ('a'), ('b');\nSELEC oops;")
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  const messages = page.getByRole('list', { name: 'Messages' })
  await expect(messages).toContainText('Error on line 3')
  await expect(messages).toContainText('2 rows affected')
  await expect(page.locator('.cm-sql-error')).toHaveCount(1)
  await expect(
    page.getByRole('tree', { name: 'Database objects' }).getByRole('treeitem', { name: /^notes/ }),
  ).toBeVisible()
  await expect(page.getByText('Uncommitted changes')).toBeVisible()
  await quitDiscarding(app)
})

test('runs only the statement under the cursor and shows RETURNING rows', async () => {
  const { app, page } = await launchWithDatabase()
  await newEditor(page, "SELECT 1;\nINSERT INTO customers(name) VALUES ('Zoya') RETURNING name;\nSELECT 3;")
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Shift+F5')
  await expect(page.getByText('1 row · 1 column')).toBeVisible()
  await expect(page.locator('[role="gridcell"]').first()).toHaveText('Zoya')
  await expect(page.getByRole('list', { name: 'Messages' })).not.toContainText('Query returned rows')
  await quitDiscarding(app)
})

test('saves SQL to a file and asks before closing unsaved SQL', async () => {
  const { app, page, userDataDir } = await launchWithDatabase()
  await newEditor(page, 'SELECT 42;')
  const path = join(userDataDir, 'query.sql')
  await stubSaveDialog(app, path)
  await page.getByRole('button', { name: /Save SQL file/ }).click()
  await expect(page.getByRole('tab', { name: 'query.sql' })).toBeVisible()
  expect(readFileSync(path, 'utf8')).toBe('SELECT 42;')

  await page.getByRole('textbox', { name: 'SQL editor' }).click()
  await page.keyboard.insertText(' -- more')
  await expect(page.getByRole('tab', { name: 'query.sql •' })).toBeVisible()
  await stubMessageBox(app, 1) // Cancel: the window stays open
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  await expect(page.getByRole('tab', { name: 'query.sql •' })).toBeVisible()

  await page.getByRole('tab', { name: 'query.sql •' }).getByRole('button', { name: /Close/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: "Don't save" }).click()
  await expect(page.getByRole('tab', { name: /query\.sql/ })).toHaveCount(0)
  await app.close()
})

test('logs the statements you run', async () => {
  const { app, page } = await launchWithDatabase()
  await newEditor(page, 'SELECT count(*) FROM orders;')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('1 row · 1 column')).toBeVisible()
  await page.getByRole('button', { name: 'Show or hide the SQL log' }).click()
  await expect(
    page.getByRole('region', { name: 'SQL log' }).getByText('SELECT count(*) FROM orders;'),
  ).toBeVisible()
  await quitDiscarding(app)
})
