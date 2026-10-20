import { app } from 'electron'
import { appChannels, appSchemas } from '@shared/ipc/app'
import type { StartupRequest } from '@shared/types/app'
import { handle } from './handle'

export interface UnsavedDocuments {
  /** Names of SQL tabs with edits that aren't saved to a file. */
  get(): string[]
}

export interface AppIpcDeps {
  /** The command line request of this launch; handed out once. */
  startupRequest: StartupRequest | null
}

export function registerAppIpc({ startupRequest }: AppIpcDeps): UnsavedDocuments {
  let unsaved: string[] = []
  let pending = startupRequest

  handle(appChannels.getInfo, appSchemas.getInfo, () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
  }))

  handle(appChannels.setUnsavedDocuments, appSchemas.setUnsavedDocuments, ({ names }) => {
    unsaved = names
  })

  handle(appChannels.takeStartupRequest, appSchemas.takeStartupRequest, () => {
    const request = pending
    pending = null
    return request
  })

  handle(appChannels.quit, appSchemas.quit, () => {
    // After the reply has gone out, so the renderer's call doesn't fail.
    setImmediate(() => app.quit())
  })

  return { get: () => unsaved }
}
