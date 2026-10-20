import { dialog, type BrowserWindow } from 'electron'

export type WindowGetter = () => BrowserWindow | null

/** An open dialog attached to the window when there is one; [] when cancelled. */
export async function chooseOpenPaths(
  getWindow: WindowGetter,
  options: Electron.OpenDialogOptions,
): Promise<string[]> {
  const win = getWindow()
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  return result.canceled ? [] : result.filePaths
}

/** A save dialog attached to the window when there is one; null when cancelled. */
export async function chooseSavePath(
  getWindow: WindowGetter,
  options: Electron.SaveDialogOptions,
): Promise<string | null> {
  const win = getWindow()
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
  return result.canceled || !result.filePath ? null : result.filePath
}
