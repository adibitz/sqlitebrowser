// Preferences: changes apply after Save, survive a restart, and Restore defaults puts them back.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { launchApp } from './launch'
import { launchWithDatabase, quitDiscarding } from './steps'

test('saves preferences that take effect and are kept', async () => {
  const { app, page, userDataDir } = await launchWithDatabase()
  await page.keyboard.press('Control+,')
  const dialog = page.getByRole('dialog', { name: 'Preferences' })
  await dialog.getByRole('button', { name: 'Data browser' }).click()
  await dialog.getByLabel('Text for NULL').fill('∅')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await page.keyboard.press('Control+,')
  await dialog.getByRole('button', { name: 'Data browser' }).click()
  await expect(dialog.getByLabel('Text for NULL')).toHaveValue('NULL')
  await dialog.getByLabel('Text for NULL').fill('∅')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
  await page
    .getByRole('tree', { name: 'Database objects' })
    .getByRole('treeitem', { name: /^customers/ })
    .dblclick()
  await expect(page.getByRole('gridcell', { name: '∅' }).first()).toBeVisible()
  await quitDiscarding(app)

  const again = await launchApp(userDataDir)
  await expect(again.page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
  await again.page.keyboard.press('Control+,')
  const prefs = again.page.getByRole('dialog', { name: 'Preferences' })
  await prefs.getByRole('button', { name: 'Data browser' }).click()
  await expect(prefs.getByLabel('Text for NULL')).toHaveValue('∅')
  await prefs.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(prefs.getByLabel('Text for NULL')).toHaveValue('NULL')
  await prefs.getByRole('button', { name: 'Save' }).click()
  await again.app.close()
})
