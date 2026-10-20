// The AI assistant against the fake AI server: answers from the demo database through MCP tools; a
// write needs approval and Revert undoes it; the chat is kept per database file (plan § 6, phase 8).
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { lastUserText, startFakeAi, type FakeAi, type FakeMessage } from './fakeAiServer'
import { launchApp } from './launch'
import { launchWithDatabase, quitDiscarding } from './steps'
import { stubOpenDialog } from './dialogs'

/** Reads first, then answers with what the tool returned; asks to write when told to add something. */
function script(messages: FakeMessage[]) {
  const user = lastUserText(messages)
  const last = messages.at(-1)!
  if (last.role === 'tool') {
    if (/add/i.test(user))
      return { text: last.content?.includes('did not approve') ? 'Okay, nothing changed.' : 'Added Zed.' }
    const n = /"rows":\[\[(\d+)\]\]/.exec(last.content ?? '')?.[1]
    return { text: `There are **${n}** customers.` }
  }
  if (/add/i.test(user))
    return { tool: 'run_sql', args: { sql: "INSERT INTO customers(name) VALUES ('Zed')" } }
  return { tool: 'run_query', args: { sql: 'SELECT count(*) AS n FROM customers' } }
}

async function addProvider(page: Page, ai: FakeAi): Promise<void> {
  await page.keyboard.press('Control+,')
  const prefs = page.getByRole('dialog', { name: 'Preferences' })
  await prefs.getByRole('button', { name: 'AI assistant' }).click()
  await prefs.getByRole('checkbox', { name: 'Turn on the AI assistant' }).click()
  await prefs.getByRole('button', { name: 'Add provider…' }).click()
  await prefs.getByRole('combobox', { name: 'Provider' }).click()
  await page.getByRole('option', { name: /OpenAI-compatible/ }).click()
  await prefs.getByLabel('Server address').fill(ai.url)
  await prefs.getByLabel('Model').fill('fake-model')
  await prefs.getByRole('button', { name: 'Add provider', exact: true }).click()
  await expect(prefs.getByRole('list', { name: 'AI providers' })).toContainText('fake-model')
  await prefs.getByRole('button', { name: 'Save' }).click()
  await expect(prefs).toBeHidden()
}

test('answers from the database, asks before writing, and keeps the chat', async () => {
  const ai = await startFakeAi(script)
  try {
    const { app, page, userDataDir, dbPath } = await launchWithDatabase()
    await addProvider(page, ai)
    await page.keyboard.press('Control+J')
    const panel = page.getByRole('complementary', { name: 'Assistant' })
    await expect(panel.getByRole('button', { name: 'Model' })).toHaveText(/127\.0\.0\.1:\d+ · fake-model/)

    const message = panel.getByRole('textbox', { name: 'Message' })
    await message.fill('How many customers are there?')
    await message.press('Enter')
    const log = panel.getByRole('log', { name: 'Conversation' })
    await expect(log.getByText('Ran a query · 1 row')).toBeVisible()
    await expect(log.getByText(/There are \d+ customers\./)).toBeVisible()
    await expect(log.locator('strong')).toHaveText(/\d+/)
    // The model saw the database and what the user was looking at.
    expect(ai.requests[0]!.find((m) => m.role === 'system')?.content).toContain('demo.db')

    await message.fill('Add a customer named Zed')
    await message.press('Enter')
    const approval = log.getByRole('region', { name: 'Change waiting for approval' })
    await expect(approval).toContainText("INSERT INTO customers(name) VALUES ('Zed')")
    await approval.getByRole('button', { name: 'Approve' }).click()
    await expect(log.getByText('Added Zed.')).toBeVisible()
    await expect(log.getByText('Changed the database · 1 row')).toBeVisible()
    await expect(page.getByText('Uncommitted changes')).toBeVisible()

    await page.getByRole('button', { name: 'Revert' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Revert' }).click()
    await expect(page.getByText('Uncommitted changes')).toHaveCount(0)
    await app.close()

    // The conversation is kept for this database file.
    const again = await launchApp(userDataDir)
    await stubOpenDialog(again.app, dbPath)
    await again.page.getByRole('button', { name: 'Open database' }).first().click()
    await expect(again.page.getByRole('tree', { name: 'Database objects' })).toBeVisible()
    await again.page.keyboard.press('Control+J')
    const restored = again.page.getByRole('complementary', { name: 'Assistant' }).getByRole('log')
    await expect(restored.getByText('How many customers are there?')).toBeVisible()
    await expect(restored.getByText('Added Zed.')).toBeVisible()
    await again.page.getByRole('button', { name: 'Clear the conversation' }).click()
    await expect(restored).toHaveCount(0)
    await quitDiscarding(again.app)
  } finally {
    await ai.close()
  }
})

test('tells the model when a change is denied', async () => {
  const ai = await startFakeAi(script)
  try {
    const { app, page } = await launchWithDatabase()
    await addProvider(page, ai)
    await page.keyboard.press('Control+J')
    const panel = page.getByRole('complementary', { name: 'Assistant' })
    await panel.getByRole('textbox', { name: 'Message' }).fill('Add a customer named Zed')
    await panel.getByRole('textbox', { name: 'Message' }).press('Enter')
    await panel.getByRole('button', { name: 'Deny' }).click()
    await expect(panel.getByText('Okay, nothing changed.')).toBeVisible()
    await expect(panel.getByText('Change not approved')).toBeVisible()
    await expect(page.getByText('Uncommitted changes')).toHaveCount(0)
    await app.close()
  } finally {
    await ai.close()
  }
})
