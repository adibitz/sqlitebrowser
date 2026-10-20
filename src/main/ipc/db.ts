import { rmSync } from 'node:fs'
import type { BrowserWindow } from 'electron'
import { dbChannels, dbEvents, dbSchemas } from '@shared/ipc/db'
import { CLOSED_DB_STATE, MEMORY_DATABASE, type DbState } from '@shared/types/db'
import { dbOptionsFromSettings } from '../dbOptions'
import { UserError } from '../errors'
import { consumeSavePath, requireExistingFile } from '../pathChecks'
import type { RecentFilesStore } from '../prefs/recentFiles'
import type { SettingsStore } from '../prefs/settings'
import type { DbWorker } from '../worker/rpc'
import { handle } from './handle'

export interface DbStateTracker {
  get(): DbState
}

export interface DbIpcDeps {
  worker: DbWorker
  getWindow: () => BrowserWindow | null
  settings: SettingsStore
  recentFiles: RecentFilesStore
}

/** Replaces the file at a save-dialog path (the dialog already asked to overwrite). */
function clearTarget(path: string): string {
  const p = consumeSavePath(path)
  try {
    rmSync(p, { force: true })
  } catch (err) {
    throw new UserError(`Couldn't replace the file: ${(err as Error).message}`, { cause: err })
  }
  return p
}

/** Registers the db area and forwards worker events to the window. Returns the latest-state tracker. */
export function registerDbIpc({ worker, getWindow, settings, recentFiles }: DbIpcDeps): DbStateTracker {
  let latest: DbState = CLOSED_DB_STATE

  worker.onEvent((event) => {
    const win = getWindow()
    if (event.name === 'state') latest = event.state
    if (!win || win.isDestroyed()) return
    if (event.name === 'state') win.webContents.send(dbEvents.state, event.state)
    else if (event.name === 'log') win.webContents.send(dbEvents.log, event.entries)
    else win.webContents.send(dbEvents.warning, event.message)
  })

  const options = (): ReturnType<typeof dbOptionsFromSettings> => dbOptionsFromSettings(settings)
  const remember = (path: string, readOnly: boolean): void => {
    if (path !== MEMORY_DATABASE) recentFiles.add(path, readOnly, settings.get('General/maxRecentFiles'))
  }

  handle(dbChannels.sqliteVersion, dbSchemas.sqliteVersion, () => worker.call('db.sqliteVersion'))

  handle(dbChannels.getState, dbSchemas.getState, () => worker.call('db.state'))

  handle(dbChannels.open, dbSchemas.open, async ({ path, readOnly }) => {
    const file = requireExistingFile(path)
    const state = await worker.call('db.open', { path: file, readOnly, options: options() })
    remember(file, readOnly)
    return state
  })

  handle(dbChannels.create, dbSchemas.create, async ({ path }) => {
    const file = clearTarget(path)
    const state = await worker.call('db.create', { path: file, options: options() })
    remember(file, false)
    return state
  })

  handle(dbChannels.openMemory, dbSchemas.openMemory, () =>
    worker.call('db.openMemory', { options: options() }),
  )

  handle(dbChannels.close, dbSchemas.close, () => worker.call('db.close'))

  handle(dbChannels.write, dbSchemas.write, () => worker.call('db.write'))

  handle(dbChannels.revert, dbSchemas.revert, () => worker.call('db.revert'))

  handle(dbChannels.saveAs, dbSchemas.saveAs, async ({ path }) => {
    const file = clearTarget(path)
    const state = await worker.call('db.saveAs', { path: file })
    remember(file, false)
    return state
  })

  handle(dbChannels.attach, dbSchemas.attach, ({ path, name }) =>
    worker.call('db.attach', { path: requireExistingFile(path), name }),
  )

  handle(dbChannels.detach, dbSchemas.detach, ({ name }) => worker.call('db.detach', { name }))

  handle(dbChannels.refreshSchema, dbSchemas.refreshSchema, () => worker.call('db.refreshSchema'))

  return { get: () => latest }
}
