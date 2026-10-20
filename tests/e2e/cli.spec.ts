// Command line flags (reference/sqliteview/app.py): open a database and table, run an SQL file, quit.
/// <reference lib="dom" />
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { launchApp, newUserDataDir } from './launch'
import { demoDbPath, finishOnboarding } from './steps'

test('opens the database and table given on the command line', async () => {
  const db = demoDbPath()
  const { app, page } = await launchApp(newUserDataDir(), [db, '-R', '--table', 'customers'])
  await finishOnboarding(page, { welcome: false })
  await expect(page.getByRole('tab', { name: 'customers', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('Read-only', { exact: true }).first()).toBeVisible()
  await app.close()
})

test('runs an SQL file, writes its changes and quits with --quit', async () => {
  const db = demoDbPath()
  const sql = join(dirname(db), 'add.sql')
  writeFileSync(sql, "CREATE TABLE cli_ran(x);\nINSERT INTO cli_ran VALUES ('done');\n")
  const { app, page } = await launchApp(newUserDataDir(), [db, '--sql', sql, '-q'])
  const closed = app.waitForEvent('close')
  await finishOnboarding(page, { welcome: false })
  await closed
  const con = new Database(db, { readonly: true })
  try {
    expect(con.prepare('SELECT x FROM cli_ran').pluck().get()).toBe('done')
  } finally {
    con.close()
  }
})
