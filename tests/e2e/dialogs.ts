import type { ElectronApplication } from '@playwright/test'

// Native file dialogs can't be driven by Playwright, so tests replace them in the main process.

/** The next "open file" dialog returns `path` (or is cancelled when null). */
export async function stubOpenDialog(app: ElectronApplication, path: string | null): Promise<void> {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = (async () =>
      filePath === null
        ? { canceled: true, filePaths: [] }
        : { canceled: false, filePaths: [filePath] }) as unknown as typeof dialog.showOpenDialog
  }, path)
}

/** The next "save file" dialog returns `path` (or is cancelled when null). */
export async function stubSaveDialog(app: ElectronApplication, path: string | null): Promise<void> {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = (async () =>
      filePath === null
        ? { canceled: true, filePath: '' }
        : { canceled: false, filePath }) as unknown as typeof dialog.showSaveDialog
  }, path)
}

/** Answers the next native message box with the button at `index` (e.g. the close guard). */
export async function stubMessageBox(app: ElectronApplication, index: number): Promise<void> {
  await app.evaluate(({ dialog }, response) => {
    dialog.showMessageBox = (async () => ({
      response,
      checkboxChecked: false,
    })) as unknown as typeof dialog.showMessageBox
  }, index)
}

/** Answers every native message box with the first button whose label is in `labels`. */
export async function stubMessageBoxByLabel(app: ElectronApplication, labels: string[]): Promise<void> {
  await app.evaluate(({ dialog }, wanted) => {
    dialog.showMessageBox = (async (...args: unknown[]) => {
      const options = args.at(-1) as { buttons?: string[] }
      const response = (options.buttons ?? []).findIndex((label) => wanted.includes(label))
      return { response: Math.max(response, 0), checkboxChecked: false }
    }) as unknown as typeof dialog.showMessageBox
  }, labels)
}
