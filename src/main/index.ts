import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { appEvents } from '@shared/ipc/app'
import type { StartupRequest } from '@shared/types/app'
import { osSecretBox } from './ai/secrets'
import { emptyRequest, hasRequest, parseCli } from './cli'
import { guardCloseWithPendingChanges } from './closeGuard'
import { registerIpc } from './ipc/register'
import { installMenu } from './menu'
import { applyUserDataOverride } from './paths'
import { openPrefsDb } from './prefs/database'
import { createChatHistoryStore } from './prefs/chatHistory'
import { createProviderStore } from './prefs/providers'
import { createRecentFilesStore } from './prefs/recentFiles'
import { createSettingsStore } from './prefs/settings'
import { applyTheme } from './theme'
import { createMainWindow } from './window'
import { startDbWorker } from './worker/rpc'

applyUserDataOverride()

/** argv after the executable, and after the app path when running from source (`electron .`). */
function cliArguments(argv: readonly string[]): string[] {
  const rest = argv.slice(1)
  if (!process.defaultApp) return rest
  const appPath = rest.findIndex((a) => !a.startsWith('-'))
  return appPath < 0 ? rest : [...rest.slice(0, appPath), ...rest.slice(appPath + 1)]
}

const cli = parseCli(cliArguments(process.argv), process.cwd(), app.getVersion())
if (cli.print !== undefined) {
  ;(cli.exitCode ? process.stderr : process.stdout).write(cli.print + '\n')
  app.exit(cli.exitCode ?? 0)
} else if (!app.requestSingleInstanceLock()) {
  app.quit()
}

/** macOS hands over associated files with 'open-file' (before the app is ready when it launches it). */
let sendOpenRequest: ((request: StartupRequest) => void) | null = null
app.on('open-file', (event, path) => {
  event.preventDefault()
  const request = { ...emptyRequest(), database: path }
  if (sendOpenRequest) sendOpenRequest(request)
  else cli.request = { ...cli.request, database: path }
})

app.whenReady().then(() => {
  const prefsDb = openPrefsDb(join(app.getPath('userData'), 'app.db'))
  const settings = createSettingsStore(prefsDb)
  const providers = createProviderStore(prefsDb, osSecretBox)
  const recentFiles = createRecentFilesStore(prefsDb)
  const worker = startDbWorker()
  let win: BrowserWindow | null = null

  installMenu()
  applyTheme(settings.get('General/theme'))

  const { dbState, unsaved } = registerIpc({
    settings,
    providers,
    history: createChatHistoryStore(prefsDb),
    recentFiles,
    secrets: osSecretBox,
    worker,
    getWindow: () => win,
    startupRequest: hasRequest(cli.request) ? cli.request : null,
    onChange: (key) => {
      if (key === 'General/theme') applyTheme(settings.get('General/theme'))
    },
  })

  const openWindow = (): BrowserWindow => {
    const w = createMainWindow({
      bounds: settings.get('MainWindow/bounds'),
      onClose: (bounds) => settings.set('MainWindow/bounds', bounds),
    })
    guardCloseWithPendingChanges(w, { tracker: dbState, unsaved, worker })
    w.on('closed', () => {
      if (win === w) win = null
    })
    return w
  }

  win = openWindow()

  sendOpenRequest = (request) => {
    if (!win) win = openWindow()
    if (win.isMinimized()) win.restore()
    win.focus()
    win.webContents.send(appEvents.openRequest, request)
  }

  app.on('second-instance', (_event, argv, workingDirectory) => {
    const { request, print } = parseCli(cliArguments(argv), workingDirectory, app.getVersion())
    if (print === undefined && hasRequest(request)) sendOpenRequest?.(request)
    else if (win) win.focus()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) win = openWindow()
  })
  app.on('will-quit', () => {
    void worker.stop()
    prefsDb.close()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
