// Smoke test of the packaged app (`npm run test:packaged`): the DB worker loads better-sqlite3 from the
// unpacked asar, the main process loads the MCP server library, and command line arguments work.
/// <reference lib="dom" />
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'
import { newUserDataDir } from './launch'
import { demoDbPath, finishOnboarding } from './steps'

const EXECUTABLES: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'dist/win-unpacked/SQliteView.exe',
  darwin: `dist/mac${process.arch === 'arm64' ? '-arm64' : ''}/SQliteView.app/Contents/MacOS/SQliteView`,
  linux: 'dist/linux-unpacked/sqliteview',
}

test.skip(!process.env.SQLITEVIEW_PACKAGED, 'Runs with npm run test:packaged, after packaging the app')

test('the packaged app opens a database from the command line', async () => {
  const executablePath = resolve(EXECUTABLES[process.platform] ?? '')
  expect(existsSync(executablePath), `${executablePath} exists`).toBe(true)
  const app = await electron.launch({
    executablePath,
    args: [demoDbPath(), '--table', 'orders'],
    env: { ...(process.env as Record<string, string>), SQLITEVIEW_USER_DATA: newUserDataDir() },
    colorScheme: null,
  })
  const page = await app.firstWindow()
  await finishOnboarding(page, { welcome: false })
  await expect(page.getByRole('tab', { name: 'orders', exact: true })).toBeVisible()
  await expect(page.locator('[role="row"][aria-rowindex="2"] [role="gridcell"]').first()).not.toBeEmpty()
  await app.close()
})
