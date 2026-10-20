import { registerAiIpc, type AiIpcDeps } from './ai'
import { registerAppIpc, type AppIpcDeps, type UnsavedDocuments } from './app'
import { registerDbIpc, type DbIpcDeps, type DbStateTracker } from './db'
import { registerFilesIpc, type FilesIpcDeps } from './files'
import { registerIoIpc } from './io'
import { registerProjectIpc } from './project'
import { registerPrefsIpc, type PrefsIpcDeps } from './prefs'
import { registerRowsIpc } from './rows'
import { registerSchemaIpc } from './schema'
import { registerSqlIpc } from './sql'

export type IpcDeps = PrefsIpcDeps & Omit<AiIpcDeps, 'dbState'> & FilesIpcDeps & DbIpcDeps & AppIpcDeps

/** Registers every IPC area; returns what the close guard needs to know. */
export function registerIpc(deps: IpcDeps): { dbState: DbStateTracker; unsaved: UnsavedDocuments } {
  const unsaved = registerAppIpc(deps)
  registerPrefsIpc(deps)
  registerFilesIpc(deps)
  registerRowsIpc(deps.worker)
  registerSqlIpc(deps.worker)
  registerSchemaIpc(deps.worker)
  registerIoIpc(deps)
  registerProjectIpc(deps)
  const dbState = registerDbIpc(deps)
  registerAiIpc({ ...deps, dbState })
  return { dbState, unsaved }
}
