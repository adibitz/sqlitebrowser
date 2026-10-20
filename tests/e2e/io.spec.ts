// Import and export: CSV import with preview, data export, SQL dump, SQL import without a database.
/// <reference lib="dom" />
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { stubOpenDialog, stubSaveDialog } from './dialogs'
import { launchApp } from './launch'
import { finishOnboarding, launchWithDatabase, quitDiscarding } from './steps'

async function databaseMenu(page: Page, item: string): Promise<void> {
  await page.getByRole('button', { name: 'demo.db' }).click()
  await page.getByRole('menuitem', { name: item }).click()
}

test('imports a CSV file into a new table after previewing it', async () => {
  const { app, page, userDataDir } = await launchWithDatabase()
  const csv = join(userDataDir, 'cities.csv')
  writeFileSync(csv, 'city;population;founded\nPune;7400000;\n"Kochi; Kerala";2100000;1341\n')
  await stubOpenDialog(app, csv)
  await databaseMenu(page, 'Import table from CSV')

  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await expect(dialog.getByLabel('Table name')).toHaveValue('cities')
  await expect(dialog.getByText('New table cities')).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Separator' }).click()
  await page.getByRole('option', { name: /Semicolon/ }).click()
  const preview = dialog.getByRole('table', { name: 'CSV preview' })
  await expect(preview.getByRole('columnheader', { name: 'population INTEGER' })).toBeVisible()
  await expect(preview.getByRole('cell', { name: 'Kochi; Kerala' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Import', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Imported 2 rows')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'cities', exact: true })).toBeVisible()
  await expect(page.getByRole('gridcell', { name: 'Kochi; Kerala' })).toBeVisible()
  await expect(page.getByText('Uncommitted changes')).toBeVisible()
  await quitDiscarding(app)
})

test('exports a table as JSON and the database as SQL', async () => {
  const { app, page, userDataDir } = await launchWithDatabase()
  const json = join(userDataDir, 'products.json')
  await stubSaveDialog(app, json)
  await page
    .getByRole('tree', { name: 'Database objects' })
    .getByRole('treeitem', { name: /^products/ })
    .click({
      button: 'right',
    })
  await page.getByRole('menuitem', { name: 'Export…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export data' })
  await expect(dialog.getByRole('checkbox', { name: 'products' })).toBeChecked()
  await dialog.getByRole('tab', { name: 'JSON' }).click()
  await dialog.getByRole('button', { name: 'Export…' }).click()
  await expect(page.getByText('Exported 1 file')).toBeVisible()
  const products = JSON.parse(readFileSync(json, 'utf8')) as { sku: string; price: number }[]
  expect(products).toHaveLength(40)
  expect(typeof products[0]!.price).toBe('number')

  const sql = join(userDataDir, 'demo.sql')
  await stubSaveDialog(app, sql)
  await databaseMenu(page, 'Export database to SQL')
  const sqlDialog = page.getByRole('dialog', { name: 'Export database to SQL' })
  await sqlDialog.getByRole('checkbox', { name: 'orders' }).click()
  await sqlDialog.getByRole('button', { name: 'Export…' }).click()
  await expect(page.getByText('Exported to demo.sql')).toBeVisible()
  const dump = readFileSync(sql, 'utf8')
  expect(dump).toContain('CREATE TABLE IF NOT EXISTS "customers"')
  expect(dump).not.toContain('"orders" (')
  await app.close()
})

test('exports the rows of a table as filtered in its tab', async () => {
  const { app, page, userDataDir } = await launchWithDatabase()
  await page
    .getByRole('tree', { name: 'Database objects' })
    .getByRole('treeitem', { name: /^products/ })
    .dblclick()
  await page.getByRole('textbox', { name: 'Search all columns' }).fill('zzz-no-match')
  await expect(page.getByText('No rows (filtered)')).toBeVisible()
  const csv = join(userDataDir, 'none.csv')
  await stubSaveDialog(app, csv)
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: 'All rows, as filtered…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export data' })
  await expect(dialog.getByText(/as filtered and sorted in its tab/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Export…' }).click()
  await expect(page.getByText('Exported 1 file')).toBeVisible()
  expect(readFileSync(csv, 'utf8').trim()).toBe('"sku","title","price","stock","image"')
  await app.close()
})

test('imports an SQL file into a new in-memory database from the start page', async () => {
  const { app, page, userDataDir } = await launchApp()
  await finishOnboarding(page)
  const sql = join(userDataDir, 'notes.sql')
  writeFileSync(sql, "CREATE TABLE notes(t TEXT);\nINSERT INTO notes VALUES ('one'), ('two');\n")
  await stubOpenDialog(app, sql)
  await page.getByRole('button', { name: /^Import SQL file/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'In memory' }).click()
  await expect(page.getByText('SQL imported')).toBeVisible()
  await expect(
    page.getByRole('tree', { name: 'Database objects' }).getByRole('treeitem', { name: /^notes/ }),
  ).toBeVisible()
  await quitDiscarding(app)
})
