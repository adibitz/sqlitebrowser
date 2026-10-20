// Display formats, conditional formats and the plot panel (test_formats_plot.py, UI parts).
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { launchWithDatabase, quitDiscarding } from './steps'

async function openTable(page: Page, name: string): Promise<void> {
  await page
    .getByRole('tree', { name: 'Database objects' })
    .getByRole('treeitem', { name: new RegExp(`^${name}`) })
    .dblclick()
}

async function columnMenu(page: Page, column: string, item: string): Promise<void> {
  await page.getByRole('button', { name: `${column} column menu` }).click()
  await page.getByRole('menuitem', { name: item }).click()
}

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="row"][aria-rowindex="${row + 1}"] [role="gridcell"]`).nth(col)

test('shows a column through a display format and keeps those cells read-only', async () => {
  const { app, page } = await launchWithDatabase()
  await openTable(page, 'customers')
  // Cells are empty placeholders until the page of rows has loaded.
  await expect(cell(page, 1, 1)).not.toBeEmpty()
  const before = (await cell(page, 1, 1).textContent()) ?? ''
  await columnMenu(page, 'name', 'Display format…')
  const dialog = page.getByRole('dialog', { name: 'Display format of name' })
  await dialog.getByRole('combobox', { name: 'Format' }).click()
  await page.getByRole('option', { name: 'Upper case' }).click()
  await expect(dialog.getByLabel('SQL expression')).toHaveValue('upper("name")')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await expect(cell(page, 1, 1)).toHaveText(before.toUpperCase())
  await cell(page, 1, 1).dblclick()
  await expect(page.getByRole('textbox', { name: 'Edit cell' })).toHaveCount(0)

  await columnMenu(page, 'name', 'Display format…')
  await dialog.getByLabel('SQL expression').fill('42')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await expect(dialog.getByRole('alert')).toContainText('function call applied to "name"')
  await app.close()
})

test('colours cells with conditional formats', async () => {
  const { app, page } = await launchWithDatabase()
  await openTable(page, 'products')
  await columnMenu(page, 'price', 'Conditional formats…')
  const dialog = page.getByRole('dialog', { name: 'Conditional formats of price' })
  await dialog.getByRole('button', { name: 'Add rule' }).click()
  await dialog.getByRole('textbox', { name: 'Condition of rule 1' }).fill('%')
  await expect(dialog.getByRole('alert')).toContainText('never matches')
  await dialog.getByRole('textbox', { name: 'Condition of rule 1' }).fill('>=0')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await expect(cell(page, 1, 2)).toHaveCSS('background-color', 'rgb(255, 241, 184)')
  await expect(cell(page, 1, 1)).not.toHaveCSS('background-color', 'rgb(255, 241, 184)')
  await app.close()
})

test('plots the active table and follows SQL results', async () => {
  const { app, page } = await launchWithDatabase()
  await openTable(page, 'products')
  await page.keyboard.press('Control+Shift+P')
  const plot = page.getByRole('complementary', { name: 'Plot' })
  await expect(plot.getByText('Plot · products')).toBeVisible()
  await expect(plot.getByText('Choose one or more numeric columns')).toBeVisible()
  await expect(plot.getByRole('checkbox', { name: 'title' })).toBeDisabled()
  await plot.getByRole('checkbox', { name: 'price' }).click()
  await expect(plot.getByRole('img', { name: 'Line chart of price by Row #' })).toBeVisible()
  await expect(plot.getByText('40 of 40 rows plotted')).toBeVisible()
  await plot.getByRole('tab', { name: 'Bar' }).click()
  await expect(plot.getByRole('img', { name: 'Bar chart of price by Row #' })).toBeVisible()

  await page.keyboard.press('Control+T')
  await page.getByRole('textbox', { name: 'SQL editor' }).click()
  await page.keyboard.insertText('SELECT 1 AS x, 10 AS y UNION ALL SELECT 2, 20 UNION ALL SELECT 3, 15;')
  await page.keyboard.press('Control+Enter')
  await expect(plot.getByText(/^Plot · SQL/)).toBeVisible()
  await plot.getByRole('combobox', { name: 'X axis' }).click()
  await page.getByRole('option', { name: 'x', exact: true }).click()
  await plot.getByRole('checkbox', { name: 'y' }).click()
  await expect(plot.getByRole('img', { name: 'Line chart of y by x' })).toBeVisible()
  await quitDiscarding(app)
})
