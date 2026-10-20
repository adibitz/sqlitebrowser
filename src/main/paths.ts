import { app } from 'electron'

/**
 * Lets tests point the app at a throwaway profile. Must run before `app` is ready.
 */
export function applyUserDataOverride(): void {
  const dir = process.env.SQLITEVIEW_USER_DATA
  if (dir) app.setPath('userData', dir)
}
