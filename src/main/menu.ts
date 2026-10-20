import { app, Menu } from 'electron'

/**
 * The toolbar and command palette replace menus. macOS still needs an application menu for the app
 * name, clipboard shortcuts and window commands; Windows and Linux get no menu bar.
 */
export function installMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }],
      },
      { role: 'editMenu' },
      { role: 'windowMenu' },
    ]),
  )
}
