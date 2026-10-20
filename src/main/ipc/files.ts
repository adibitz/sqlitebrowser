import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { shell } from 'electron'
import { stripBom } from '@shared/format/data'
import { filesChannels, filesSchemas } from '@shared/ipc/files'
import { UserError } from '../errors'
import {
  allowTextWrites,
  approveExtensionPath,
  approveSavePath,
  requireExistingFile,
  requireWritableText,
} from '../pathChecks'
import type { RecentFilesStore } from '../prefs/recentFiles'
import type { SettingsStore } from '../prefs/settings'
import { handle } from './handle'
import { chooseOpenPaths, chooseSavePath, type WindowGetter } from './nativeDialogs'

const MAX_BINARY_FILE = 512 * 1024 * 1024

export const DATABASE_FILTERS: Electron.FileFilter[] = [
  { name: 'SQLite databases', extensions: ['db', 'sqlite', 'sqlite3', 'db3'] },
  // Projects open through the normal Open too (upstream).
  { name: 'DB Browser for SQLite projects', extensions: ['sqbpro'] },
  { name: 'All files', extensions: ['*'] },
]

export const SAVE_PROPERTIES: Electron.SaveDialogOptions['properties'] = [
  'showOverwriteConfirmation',
  'createDirectory',
]
export const ALL_FILES: Electron.FileFilter = { name: 'All files', extensions: ['*'] }

export interface FilesIpcDeps {
  getWindow: WindowGetter
  settings: SettingsStore
  recentFiles: RecentFilesStore
}

/** Where dialogs start: next to the most recent file, else 'db/defaultlocation', else the OS default. */
export function defaultFolder({ settings, recentFiles }: FilesIpcDeps): string | undefined {
  const recent = recentFiles.list().find((f) => f.exists)
  return recent?.folder || settings.get('db/defaultlocation') || undefined
}

export function registerFilesIpc(deps: FilesIpcDeps): void {
  const { getWindow } = deps

  handle(filesChannels.showOpenDatabase, filesSchemas.showOpenDatabase, async ({ title }) => {
    const [path] = await chooseOpenPaths(getWindow, {
      title,
      defaultPath: defaultFolder(deps),
      properties: ['openFile'],
      filters: DATABASE_FILTERS,
    })
    return path ?? null
  })

  handle(filesChannels.showSaveDatabase, filesSchemas.showSaveDatabase, async ({ title, defaultName }) => {
    const folder = defaultFolder(deps)
    const path = await chooseSavePath(getWindow, {
      title,
      defaultPath: folder && defaultName ? `${folder}/${defaultName}` : (defaultName ?? folder),
      filters: DATABASE_FILTERS,
      properties: SAVE_PROPERTIES,
    })
    if (path) approveSavePath(path)
    return path
  })

  handle(filesChannels.saveText, filesSchemas.saveText, async ({ title, defaultName, filters, content }) => {
    const path = await chooseSavePath(getWindow, {
      title,
      defaultPath: defaultName,
      filters: [...filters, { name: 'All files', extensions: ['*'] }],
      properties: SAVE_PROPERTIES,
    })
    if (!path) return null
    writeFileSync(path, content, 'utf8')
    allowTextWrites(path)
    return path
  })

  handle(filesChannels.openBinary, filesSchemas.openBinary, async ({ title }) => {
    const [path] = await chooseOpenPaths(getWindow, { title, properties: ['openFile'] })
    if (!path) return null
    if (statSync(path).size > MAX_BINARY_FILE) throw new UserError('That file is larger than 512 MB.')
    return { name: basename(path), data: new Uint8Array(readFileSync(path)) }
  })

  handle(filesChannels.saveBinary, filesSchemas.saveBinary, async ({ title, defaultName, data }) => {
    const path = await chooseSavePath(getWindow, {
      title,
      defaultPath: defaultName,
      properties: SAVE_PROPERTIES,
    })
    if (!path) return null
    writeFileSync(path, data)
    return path
  })

  handle(filesChannels.openText, filesSchemas.openText, async ({ title, filters }) => {
    const [path] = await chooseOpenPaths(getWindow, {
      title,
      properties: ['openFile'],
      filters: [...filters, { name: 'All files', extensions: ['*'] }],
    })
    if (!path) return null
    if (statSync(path).size > MAX_BINARY_FILE) throw new UserError('That file is larger than 512 MB.')
    allowTextWrites(path)
    return { path, name: basename(path), content: stripBom(readFileSync(path, 'utf8')) }
  })

  handle(filesChannels.openTextAt, filesSchemas.openTextAt, ({ path }) => {
    const file = requireExistingFile(path)
    if (statSync(file).size > MAX_BINARY_FILE) throw new UserError('That file is larger than 512 MB.')
    allowTextWrites(file)
    return { path: file, name: basename(file), content: stripBom(readFileSync(file, 'utf8')) }
  })

  handle(filesChannels.writeText, filesSchemas.writeText, ({ path, content }) => {
    writeFileSync(requireWritableText(path), content, 'utf8')
  })

  handle(filesChannels.chooseFolder, filesSchemas.chooseFolder, async ({ title, defaultPath }) => {
    const [folder] = await chooseOpenPaths(getWindow, {
      title,
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory', 'createDirectory'],
    })
    return folder ?? null
  })

  handle(filesChannels.chooseExtension, filesSchemas.chooseExtension, async () => {
    const [path] = await chooseOpenPaths(getWindow, {
      title: 'Select extension',
      properties: ['openFile'],
      filters: [{ name: 'SQLite extensions', extensions: ['dll', 'so', 'dylib'] }, ALL_FILES],
    })
    if (path) approveExtensionPath(path)
    return path ?? null
  })

  handle(filesChannels.recent, filesSchemas.recent, () => deps.recentFiles.list())

  handle(filesChannels.clearRecent, filesSchemas.clearRecent, () => deps.recentFiles.clear())

  handle(filesChannels.revealInFolder, filesSchemas.revealInFolder, ({ path }) => {
    shell.showItemInFolder(requireExistingFile(path))
  })
}
