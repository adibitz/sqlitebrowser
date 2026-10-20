// .sqbpro projects: save the workspace, open it again in a fresh window (test_project.py, app part).
/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { stubOpenDialog, stubSaveDialog } from './dialogs'
import { launchApp } from './launch'
import { finishOnboarding, launchWithDatabase, quitDiscarding } from './steps'

test('saves tabs, filters and SQL to a project and restores them', async () => {
  const first = await launchWithDatabase()
  // Next to the database, so the project stores its path relative to itself.
  const project = join(dirname(first.dbPath), 'work.sqbpro')
  {
    const { app, page } = first
    await page.keyboard.press('Control+T')
    await page.getByRole('textbox', { name: 'SQL editor' }).click()
    await page.keyboard.insertText('SELECT 42;')
    await page
      .getByRole('tree', { name: 'Database objects' })
      .getByRole('treeitem', { name: /^customers/ })
      .dblclick()
    await page.getByRole('textbox', { name: 'Filter country' }).fill('=IN')
    await expect(page.getByText(/filtered/).first()).toBeVisible()

    await stubSaveDialog(app, join(dirname(first.dbPath), 'work'))
    await page.getByRole('button', { name: 'demo.db' }).click()
    await page.getByRole('menuitem', { name: 'Save project as' }).click()
    await expect(page.getByText('Project saved to work.sqbpro')).toBeVisible()
    const xml = readFileSync(project, 'utf8')
    expect(xml).toContain('<db path="demo.db"')
    expect(xml).toContain('<filter_values><column index="3" value="=IN"/></filter_values>')
    await quitDiscarding(app)
  }

  const { app, page } = await launchApp()
  await finishOnboarding(page)
  await stubOpenDialog(app, project)
  await page.getByRole('button', { name: 'Open database' }).first().click()
  await expect(page.getByText('Opened project work.sqbpro')).toBeVisible()
  const tabs = page.getByRole('tablist', { name: 'Open documents' }).getByRole('tab')
  await expect(tabs).toHaveText([/Database info/, /SQL 1/, /customers/])
  await expect(page.getByRole('tab', { name: 'customers', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('textbox', { name: 'Filter country' })).toHaveValue('=IN')
  await page.getByRole('tab', { name: /SQL 1/ }).click()
  await expect(page.getByRole('textbox', { name: 'SQL editor' })).toHaveText('SELECT 42;')
  await quitDiscarding(app)
})
