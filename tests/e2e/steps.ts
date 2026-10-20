import { join } from 'node:path'
import { expect, type ElectronApplication, type Page } from '@playwright/test'
import { makeDemoDb } from '../fixtures/makeDemoDb'
import { stubMessageBoxByLabel, stubOpenDialog } from './dialogs'
import { launchApp, newUserDataDir, type LaunchedApp } from './launch'

/** Quits even with unsaved SQL or uncommitted changes: the close guard is answered with Discard. */
export async function quitDiscarding(app: ElectronApplication): Promise<void> {
  await stubMessageBoxByLabel(app, ['Close without saving', 'Discard'])
  await app.close()
}

/** Accepts the onboarding defaults (System theme, AI off). `welcome`: expect the start page next. */
export async function finishOnboarding(page: Page, { welcome = true } = {}): Promise<void> {
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  if (welcome) await expect(page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
}

/** A demo database in a temp folder. Fewer orders than the full fixture keeps tests fast. */
export function demoDbPath(orders = 2000): string {
  const path = join(newUserDataDir(), 'demo.db')
  makeDemoDb(path, orders)
  return path
}

/** Launches, onboards and opens `dbPath` through the Open dialog. */
export async function launchWithDatabase(
  dbPath: string = demoDbPath(),
): Promise<LaunchedApp & { dbPath: string }> {
  const launched = await launchApp()
  await finishOnboarding(launched.page)
  await stubOpenDialog(launched.app, dbPath)
  await launched.page.getByRole('button', { name: 'Open database' }).first().click()
  await expect(launched.page.getByRole('tree', { name: 'Database objects' })).toBeVisible()
  return { ...launched, dbPath }
}
