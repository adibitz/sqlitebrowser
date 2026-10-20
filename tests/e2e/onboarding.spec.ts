import { join } from 'node:path'
import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { launchApp } from './launch'

test('first launch asks for a theme and the Claude Code choice, then never again', async () => {
  const first = await launchApp()
  const { page } = first

  await expect(page.getByRole('heading', { name: 'Choose a theme' })).toBeVisible()
  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'Claude Code' })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Off/ })).toBeChecked()
  await page.getByRole('button', { name: 'Finish' }).click()

  await expect(page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
  await expect(page.getByTestId('app-version')).toContainText(/SQLite 3\.\d+/)
  await first.app.close()

  // Restart with the same profile: straight to the start page, theme kept.
  const second = await launchApp(first.userDataDir)
  await expect(second.page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
  await expect(second.page.locator('html')).toHaveClass(/dark/)
  await second.app.close()
})

test('turning on Claude Code saves the choice and starts the MCP server', async () => {
  const { app, page, userDataDir } = await launchApp()

  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /On/ }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()

  await page.keyboard.press('Control+,')
  const prefs = page.getByRole('dialog', { name: 'Preferences' })
  await prefs.getByRole('button', { name: 'Claude Code (MCP)' }).click()
  await expect(prefs.getByRole('checkbox', { name: 'Let Claude Code control SQliteView' })).toBeChecked()
  // Running, or (when another program holds the default port) a message that says so.
  await expect(prefs.getByRole('status', { name: 'MCP server status' })).toHaveText(/Running at|in use/)
  await app.close()

  const db = new Database(join(userDataDir, 'app.db'), { readonly: true })
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'MCP/enabled'").pluck().get()
  db.close()
  expect(enabled).toBe('true')
})
