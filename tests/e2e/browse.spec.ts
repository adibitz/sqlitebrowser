/// <reference lib="dom" />
// Port of reference/tests/test_browse_features.py (pagination, filters, chips, selection, row details)
// plus editing, Write/Revert and the close guard.
import Database from 'better-sqlite3'
import { expect, test, type Page } from '@playwright/test'
import { stubMessageBox } from './dialogs'
import { launchWithDatabase, quitDiscarding } from './steps'

async function openCustomers(page: Page): Promise<void> {
  await page
    .getByRole('tree', { name: 'Database objects' })
    .getByRole('treeitem', { name: /^customers/ })
    .dblclick()
  await expect(page.getByText('Showing 1–100 of 500')).toBeVisible()
}

/** Grid cell by 1-based row number and column position (0 = first data column). */
function cell(page: Page, rowNumber: number, col: number) {
  return page.locator(`[role="row"][aria-rowindex="${rowNumber + 1}"] [role="gridcell"]`).nth(col)
}

test('pages through rows and shows all of them in one list', async () => {
  const { app, page } = await launchWithDatabase()
  await openCustomers(page)
  await expect(page.getByText('Page 1 of 5')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Showing 101–200 of 500')).toBeVisible()
  await expect(cell(page, 101, 0)).toHaveText('101')
  await page.getByRole('button', { name: 'Last page' }).click()
  await expect(cell(page, 401, 0)).toHaveText('401')
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()

  await page.getByRole('combobox', { name: 'Rows per page' }).click()
  await page.getByRole('option', { name: 'All' }).click()
  await expect(page.getByText('Showing 1–500 of 500')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Pages' })).toHaveCount(0)

  await page.keyboard.press('F11')
  await expect(page.getByRole('toolbar', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByRole('tree', { name: 'Database objects' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('toolbar', { name: 'Main' })).toBeVisible()
  await app.close()
})

test('filters by column, shows chips, and clears them', async () => {
  const { app, page } = await launchWithDatabase()
  await openCustomers(page)
  await page.getByRole('textbox', { name: 'Filter country' }).fill('=IN')
  await expect(page.getByText(/of \d+ \(filtered\)/)).toBeVisible()
  await page.getByRole('button', { name: 'name column menu' }).click()
  await page.getByRole('menuitem', { name: 'Sort descending' }).click()
  const chips = page.getByRole('list', { name: 'Active filters' })
  await expect(chips.getByRole('button', { name: /country = IN/ })).toBeVisible()
  await expect(chips.getByRole('button', { name: /Sorted by name ↓/ })).toBeVisible()

  await chips.getByRole('button', { name: /country = IN/ }).click()
  await expect(page.getByText('Showing 1–100 of 500')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Filter country' })).toHaveValue('')
  await app.close()
})

test('edits a cell, then reverts and writes changes', async () => {
  const { app, page, dbPath } = await launchWithDatabase()
  await openCustomers(page)
  await cell(page, 1, 1).dblclick()
  await page.getByRole('textbox', { name: 'Edit cell' }).fill('Edited Name')
  await page.keyboard.press('Enter')
  await expect(cell(page, 1, 1)).toHaveText('Edited Name')
  await expect(page.getByText('Uncommitted changes')).toBeVisible()

  await page.getByRole('button', { name: 'Revert' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Revert' }).click()
  await expect(cell(page, 1, 1)).not.toHaveText('Edited Name')
  await expect(page.getByText('Uncommitted changes')).toHaveCount(0)

  await cell(page, 2, 1).click()
  await page.keyboard.type('Typed')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Write changes' }).click()
  await expect(page.getByText('All changes written to disk')).toBeVisible()
  await app.close()

  const con = new Database(dbPath, { readonly: true })
  expect(con.prepare('SELECT name FROM customers WHERE id = 2').pluck().get()).toBe('Typed')
  con.close()
})

test('adds and deletes records', async () => {
  const { app, page } = await launchWithDatabase()
  await openCustomers(page)
  await page.getByRole('button', { name: 'New record' }).click()
  await expect(page.getByText('Showing 501–501 of 501')).toBeVisible()
  await cell(page, 501, 1).click()
  await page.getByRole('button', { name: 'Delete selected records' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Showing 401–500 of 500')).toBeVisible()
  await quitDiscarding(app)
})

test('copies selected rows as JSON and opens row details', async () => {
  const { app, page } = await launchWithDatabase()
  await openCustomers(page)
  await page.getByRole('rowheader').filter({ hasText: /^3$/ }).click()
  await page
    .getByRole('rowheader')
    .filter({ hasText: /^4$/ })
    .click({ modifiers: ['Control'] })
  await page
    .getByRole('rowheader')
    .filter({ hasText: /^6$/ })
    .click({ modifiers: ['Control'] })
  await expect(page.getByText('3 rows selected')).toBeVisible()
  await page.getByRole('button', { name: 'Copy as' }).click()
  await page.getByRole('menuitem', { name: 'Rows as JSON' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  const data = JSON.parse(copied) as { id: number; email: string }[]
  expect(data.map((d) => d.id)).toEqual([3, 4, 6])
  expect(data[0]!.email).toBe('user3@example.com')

  await page.getByRole('rowheader').filter({ hasText: /^2$/ }).dblclick()
  await expect(page.getByRole('dialog').getByText('Row 2 of 500')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog').getByText('Row 3 of 500')).toBeVisible()
  await app.close()
})

test('asks before closing the window with uncommitted changes', async () => {
  const { app, page, dbPath } = await launchWithDatabase()
  await openCustomers(page)
  await cell(page, 1, 1).dblclick()
  await page.getByRole('textbox', { name: 'Edit cell' }).fill('Not saved')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Uncommitted changes')).toBeVisible()

  await stubMessageBox(app, 1) // Discard
  const closed = app.waitForEvent('close')
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  await closed

  const con = new Database(dbPath, { readonly: true })
  expect(con.prepare('SELECT name FROM customers WHERE id = 1').pluck().get()).not.toBe('Not saved')
  con.close()
})
