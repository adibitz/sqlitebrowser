import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'

/** Asks the user before an MCP client writes the pending changes; true = write. */
export async function confirmWrite(win: BrowserWindow | null): Promise<boolean> {
  const options: MessageBoxOptions = {
    type: 'question',
    buttons: ['Write changes', 'Keep uncommitted'],
    defaultId: 1,
    cancelId: 1,
    message: 'Write the changes to disk?',
    detail:
      'An AI tool connected through the MCP server wants to save every uncommitted change. ' +
      "Once written, they can't be reverted.",
  }
  if (!win || win.isDestroyed()) return (await dialog.showMessageBox(options)).response === 0
  win.show()
  return (await dialog.showMessageBox(win, options)).response === 0
}
