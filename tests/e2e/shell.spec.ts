import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { stubSaveDialog } from './dialogs'
import { launchApp } from './launch'
import { demoDbPath, finishOnboarding, launchWithDatabase } from './steps'

test('opens a database and lists its objects in the explorer', async () => {
  const { app, page } = await launchWithDatabase()
  const tree = page.getByRole('tree', { name: 'Database objects' })
  for (const name of ['customers', 'orders', 'products']) {
    await expect(tree.getByRole('treeitem', { name: new RegExp(`^${name}`) })).toBeVisible()
  }
  await expect(page.getByText('3 tables · 1 view')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Database info', exact: true })).toBeVisible()
  await expect(page.getByText('3 / 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Database schema' }).click()
  await expect(page.getByText('CREATE TABLE customers')).toBeVisible()
  await app.close()
})

test('filters the explorer and opens a table structure', async () => {
  const { app, page } = await launchWithDatabase()
  await page.getByRole('textbox', { name: 'Filter objects' }).fill('email')
  const tree = page.getByRole('tree', { name: 'Database objects' })
  await expect(tree.getByRole('treeitem', { name: /^email/ })).toBeVisible()
  await expect(tree.getByRole('treeitem', { name: /^orders/ })).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Filter objects' }).fill('')
  await tree.getByRole('treeitem', { name: /^products/ }).dblclick()
  await expect(page.getByRole('tab', { name: 'products' })).toBeVisible()
  await expect(page.getByText('Without rowid')).toBeVisible()
  await page.getByRole('tab', { name: 'Structure' }).click()
  await expect(page.getByRole('cell', { name: 'sku', exact: true })).toBeVisible()
  await app.close()
})

test('the command palette opens a table by name', async () => {
  const { app, page } = await launchWithDatabase()
  await page.keyboard.press('Control+K')
  await page.getByRole('combobox').fill('order_sum')
  await page.getByRole('option', { name: /^order_summary View/ }).click()
  await expect(page.getByRole('tab', { name: 'order_summary' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /customer/ })).toBeVisible()
  await app.close()
})

test('creates a new database and remembers it in the recent list', async () => {
  const { app, page, userDataDir } = await launchApp()
  await finishOnboarding(page)
  const path = join(userDataDir, 'fresh.db')
  await stubSaveDialog(app, path)
  await page.getByRole('button', { name: /^New database/ }).click()
  // Like upstream, a new database starts with the Create Table dialog.
  await expect(page.getByRole('dialog', { name: 'Create table' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Create table' })).toBeHidden()
  await expect(page.getByText('0 tables · 0 views')).toBeVisible()

  await page.keyboard.press('Control+F4')
  await expect(page.getByRole('list', { name: 'Recent databases' }).getByText('fresh.db')).toBeVisible()
  await page
    .getByRole('list', { name: 'Recent databases' })
    .getByRole('button', { name: /fresh\.db/ })
    .click()
  await expect(page.getByText('0 tables · 0 views')).toBeVisible()
  await app.close()
})

test('reports a file that is not a database', async () => {
  const notDb = demoDbPath(10).replace('demo.db', 'notes.db')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(notDb, 'just some text that is long enough to look like a file header, but is not one at all')
  const { app, page } = await launchApp()
  await finishOnboarding(page)
  const { stubOpenDialog } = await import('./dialogs')
  await stubOpenDialog(app, notDb)
  await page.getByRole('button', { name: 'Open database' }).first().click()
  await expect(page.getByText(/not a database/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
  await app.close()
})
