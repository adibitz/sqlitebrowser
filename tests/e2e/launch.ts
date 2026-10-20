import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
  userDataDir: string
}

const INHERITED_ENV_BLOCKLIST = new Set(['ELECTRON_RENDERER_URL', 'ELECTRON_RUN_AS_NODE'])

/** A fresh, empty profile folder, so tests never touch real preferences. */
export function newUserDataDir(): string {
  return mkdtempSync(join(tmpdir(), 'sqliteview-e2e-'))
}

/**
 * Launches the built app (run `npm run build` first) with its own profile folder.
 * Pass the same `userDataDir` again to simulate restarting the app; `args` go on the command line.
 */
export async function launchApp(
  userDataDir: string = newUserDataDir(),
  args: string[] = [],
): Promise<LaunchedApp> {
  const env: Record<string, string> = { SQLITEVIEW_USER_DATA: userDataDir }
  for (const [key, value] of Object.entries(process.env)) {
    // A dev-server URL or run-as-node flag from the parent shell would start the wrong app.
    if (value !== undefined && !INHERITED_ENV_BLOCKLIST.has(key)) env[key] ??= value
  }

  // colorScheme: null stops Playwright forcing a light scheme, so the app's own theme setting applies.
  const app = await electron.launch({ args: [resolve('.'), ...args], env, colorScheme: null })
  const page = await app.firstWindow()
  return { app, page, userDataDir }
}
