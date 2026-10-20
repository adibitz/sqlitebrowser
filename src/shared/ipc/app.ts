import { z } from 'zod'
import type { AppInfo, StartupRequest } from '../types/app'

export const appChannels = {
  getInfo: 'app:getInfo',
  setUnsavedDocuments: 'app:setUnsavedDocuments',
  takeStartupRequest: 'app:takeStartupRequest',
  quit: 'app:quit',
} as const

/** Pushed from main to the renderer. */
export const appEvents = {
  /** Another launch passed files to open (second instance, file association). */
  openRequest: 'app:openRequest',
} as const

export const appSchemas = {
  getInfo: z.undefined(),
  setUnsavedDocuments: z.object({ names: z.array(z.string().max(300)).max(1000) }),
  takeStartupRequest: z.undefined(),
  quit: z.undefined(),
}

export interface AppApi {
  getInfo(): Promise<AppInfo>
  /** Names of SQL tabs with unsaved edits; the window asks before closing while there are any. */
  setUnsavedDocuments(req: { names: string[] }): Promise<void>
  /** The command line request of this launch, once (null afterwards or without one). */
  takeStartupRequest(): Promise<StartupRequest | null>
  /** Quits the app (the close guard still asks about unsaved work). */
  quit(): Promise<void>
  onOpenRequest(listener: (request: StartupRequest) => void): () => void
}
