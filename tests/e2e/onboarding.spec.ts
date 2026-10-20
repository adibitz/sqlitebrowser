import { join } from 'node:path'
import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { launchApp } from './launch'

test('first launch asks for a theme and AI choice, then never again', async () => {
  const first = await launchApp()
  const { page } = first

  await expect(page.getByRole('heading', { name: 'Choose a theme' })).toBeVisible()
  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'AI assistant' })).toBeVisible()
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

test('turning on Claude requires a key and stores it encrypted', async () => {
  const { app, page, userDataDir } = await launchApp()

  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /On/ }).click()
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('claude-sonnet-5-5')

  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter your Anthropic API key')

  const key = 'sk-ant-e2e-secret-value'
  await page.getByLabel('API key', { exact: true }).fill(key)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('heading', { name: /Open, browse, edit and query/ })).toBeVisible()
  await app.close()

  const db = new Database(join(userDataDir, 'app.db'), { readonly: true })
  const provider = db.prepare('SELECT kind, default_model, api_key FROM ai_providers').get() as {
    kind: string
    default_model: string
    api_key: Buffer | null
  }
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'ai/enabled'").pluck().get()
  db.close()

  expect(provider.kind).toBe('anthropic')
  expect(provider.default_model).toBe('claude-sonnet-5-5')
  expect(enabled).toBe('true')
  if (provider.api_key) expect(provider.api_key.toString('utf8')).not.toContain(key)
})
