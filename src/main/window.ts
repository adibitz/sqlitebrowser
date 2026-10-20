import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import type { Settings } from '@shared/settings/schema'
import { windowBackground } from './theme'

type Bounds = NonNullable<Settings['MainWindow/bounds']>

export interface MainWindowOptions {
  bounds: Bounds | null
  onClose: (bounds: Bounds) => void
}

/** Dev server URL set by electron-vite in development; undefined in a built app. */
export function devServerUrl(): string | undefined {
  return process.env.ELECTRON_RENDERER_URL
}

export function createMainWindow({ bounds, onClose }: MainWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    width: bounds?.width ?? 1280,
    height: bounds?.height ?? 820,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'SQliteView',
    backgroundColor: windowBackground(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })

  win.once('ready-to-show', () => {
    if (bounds?.maximized) win.maximize()
    win.show()
  })

  win.on('close', () => {
    const { x, y, width, height } = win.getNormalBounds()
    onClose({ x, y, width, height, maximized: win.isMaximized() })
  })

  // The window only ever shows our own page; https links open in the OS browser.
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = devServerUrl()
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}
