// Structure editing: create / modify tables, create indices, insert records, drop objects, pragmas.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { launchWithDatabase, quitDiscarding } from './steps'

const tree = (page: Page) => page.getByRole('tree', { name: 'Database objects' })

async function commitText(page: Page, label: string, text: string): Promise<void> {
  const input = page.getByRole('dialog').getByLabel(label, { exact: true })
  await input.fill(text)
  await input.press('Enter')
}

test('creates a table in the dialog, then inserts a record with values', async () => {
  const { app, page } = await launchWithDatabase()
  await page.keyboard.press('Control+Shift+T')
  const dialog = page.getByRole('dialog', { name: 'Create table' })
  await expect(dialog.getByRole('alert')).toHaveText('Please enter a name for the table.')
  await dialog.getByLabel('Table', { exact: true }).fill('notes')
  await dialog.getByRole('button', { name: 'Add column' }).click()
  await dialog.getByRole('button', { name: 'Add column' }).click()
  await commitText(page, 'Column 1 name', 'id')
  await dialog.getByRole('checkbox', { name: 'Column 1 primary key' }).click()
  await dialog.getByRole('checkbox', { name: 'Column 1 autoincrement' }).click()
  await commitText(page, 'Column 2 name', 'id')
  await expect(dialog.getByRole('alert')).toHaveText("There already is a column named 'id'.")
  await commitText(page, 'Column 2 name', 'body')
  await commitText(page, 'Column 2 type', 'TEXT')
  await dialog.getByRole('checkbox', { name: 'Column 2 not null' }).click()
  const preview = dialog.getByRole('region', { name: 'SQL preview' })
  await expect(preview).toContainText('"body"\tTEXT NOT NULL')
  await expect(preview).toContainText('PRIMARY KEY("id" AUTOINCREMENT)')
  await dialog.getByRole('button', { name: 'Create table', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('tab', { name: 'notes', exact: true })).toBeVisible()
  await expect(tree(page).getByRole('treeitem', { name: /^notes/ })).toBeVisible()
  await expect(page.getByText('Uncommitted changes')).toBeVisible()

  await page.getByRole('button', { name: 'Insert record with values' }).click()
  const insert = page.getByRole('dialog', { name: 'Insert record into notes' })
  await insert.getByRole('textbox', { name: 'Value of body' }).fill("it's here")
  await expect(insert.getByRole('region', { name: 'SQL preview' })).toContainText(
    `INSERT INTO "main"."notes" ("body") VALUES ('it''s here');`,
  )
  await insert.getByRole('button', { name: 'Insert', exact: true }).click()
  await expect(insert).toBeHidden()
  await expect(page.getByRole('gridcell', { name: "it's here" })).toBeVisible()
  await quitDiscarding(app)
})

test('modifies a table: renames, drops and adds columns and keeps the data', async () => {
  const { app, page } = await launchWithDatabase()
  await tree(page)
    .getByRole('treeitem', { name: /^customers/ })
    .dblclick()
  await page.getByRole('button', { name: 'Modify table' }).click()
  const dialog = page.getByRole('dialog', { name: 'Modify table customers' })
  await expect(dialog.getByRole('textbox', { name: 'Column 3 name' })).toHaveValue('email')

  await commitText(page, 'Column 3 name', 'mail')
  await dialog.getByRole('textbox', { name: 'Column 6 name' }).click()
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
  await dialog.getByRole('button', { name: 'Add column' }).click()
  await commitText(page, 'Column 6 name', 'notes')
  const preview = dialog.getByRole('region', { name: 'SQL preview' })
  await expect(preview).toContainText('"mail"\tTEXT UNIQUE')
  await expect(preview).not.toContainText('"meta"')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Table customers modified')).toBeVisible()

  const headers = page.getByRole('columnheader')
  await expect(headers.filter({ hasText: /^mail$/ })).toBeVisible()
  await expect(headers.filter({ hasText: /^notes$/ })).toBeVisible()
  await expect(headers.filter({ hasText: /^meta$/ })).toHaveCount(0)
  await expect(page.locator('[role="row"][aria-rowindex="2"] [role="gridcell"]').nth(1)).not.toBeEmpty()
  await quitDiscarding(app)
})

test('creates an index on a table', async () => {
  const { app, page } = await launchWithDatabase()
  await tree(page)
    .getByRole('treeitem', { name: /^customers/ })
    .dblclick()
  await page.getByRole('button', { name: 'Create index' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create index' })
  await dialog.getByRole('textbox', { name: 'Name' }).fill('idx_customers_name')
  await dialog.getByRole('checkbox', { name: 'name', exact: true }).click()
  await dialog.getByRole('checkbox', { name: 'Unique' }).click()
  await expect(dialog.getByRole('region', { name: 'SQL preview' })).toContainText(
    'CREATE UNIQUE INDEX "idx_customers_name" ON "customers"',
  )
  await dialog.getByRole('button', { name: 'Create index', exact: true }).click()
  // Customer names repeat, so SQLite refuses; the dialog stays open with its message.
  await expect(dialog.getByRole('alert')).toContainText('UNIQUE constraint failed: customers.name')
  await dialog.getByRole('checkbox', { name: 'Unique' }).click()
  await dialog.getByRole('button', { name: 'Create index', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('tab', { name: 'Structure' }).click()
  await expect(page.getByRole('cell', { name: 'idx_customers_name' })).toBeVisible()
  await quitDiscarding(app)
})

test('deletes a view after asking, and Revert brings it back', async () => {
  const { app, page } = await launchWithDatabase()
  // Only the Tables group starts expanded; filtering shows matches in every group.
  await page.getByRole('textbox', { name: 'Filter objects' }).fill('order_summary')
  await tree(page)
    .getByRole('treeitem', { name: /^order_summary/ })
    .click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete view…' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete view' }).click()
  await expect(tree(page).getByRole('treeitem', { name: /^order_summary/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Revert' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Revert' }).click()
  await expect(tree(page).getByRole('treeitem', { name: /^order_summary/ })).toBeVisible()
  await app.close()
})

test('shows database info and saves pragmas, writing pending changes first', async () => {
  const { app, page } = await launchWithDatabase()
  await expect(page.getByText('Read / write')).toBeVisible()
  await page.keyboard.press('Control+Shift+T')
  const dialog = page.getByRole('dialog', { name: 'Create table' })
  await dialog.getByLabel('Table', { exact: true }).fill('scratch')
  await dialog.getByRole('button', { name: 'Add column' }).click()
  await dialog.getByRole('button', { name: 'Create table', exact: true }).click()
  await expect(page.getByText('Uncommitted changes')).toBeVisible()

  await page.getByRole('tab', { name: 'Database info' }).click()
  await page.getByRole('spinbutton', { name: 'User version' }).fill('7')
  await page.getByRole('button', { name: 'Save pragmas' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Write and set pragmas' }).click()
  await expect(page.getByText('1 pragma updated')).toBeVisible()
  await expect(page.getByText('Uncommitted changes')).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: 'User version' })).toHaveValue('7')
  await app.close()
})
