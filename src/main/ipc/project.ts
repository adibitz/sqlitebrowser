import { projectChannels, projectSchemas } from '@shared/ipc/project'
import {
  emptyProject,
  isProjectFile,
  PROJECT_EXTENSION,
  ProjectError,
  projectFileName,
} from '@shared/project/sqbpro'
import { UserError } from '../errors'
import { loadProject, saveProject } from '../core/projectFile'
import { requireExistingFile } from '../pathChecks'
import type { DbWorker } from '../worker/rpc'
import { ALL_FILES, defaultFolder, SAVE_PROPERTIES, type FilesIpcDeps } from './files'
import { handle } from './handle'
import { chooseOpenPaths, chooseSavePath } from './nativeDialogs'

export type ProjectIpcDeps = FilesIpcDeps & { worker: DbWorker }

export const PROJECT_FILTER: Electron.FileFilter = {
  name: 'DB Browser for SQLite projects',
  extensions: [PROJECT_EXTENSION.slice(1)],
}

/** Project files (.sqbpro): read and written here, applied to the workspace by the window. */
export function registerProjectIpc(deps: ProjectIpcDeps): void {
  const { getWindow, worker, recentFiles, settings } = deps
  const remember = (path: string, readOnly: boolean): void =>
    recentFiles.add(path, readOnly, settings.get('General/maxRecentFiles'))

  handle(projectChannels.open, projectSchemas.open, async ({ path }) => {
    const chosen =
      path ??
      (
        await chooseOpenPaths(getWindow, {
          title: 'Choose a project file to open',
          defaultPath: defaultFolder(deps),
          properties: ['openFile'],
          filters: [PROJECT_FILTER, ALL_FILES],
        })
      )[0]
    if (!chosen) return null
    const file = requireExistingFile(chosen)
    let project
    try {
      project = loadProject(file)
    } catch (err) {
      if (err instanceof ProjectError) throw new UserError(err.message, { cause: err })
      throw new UserError(`Could not read the project file.\nReason: ${(err as Error).message}`, {
        cause: err,
      })
    }
    if (!project.dbPath || isProjectFile(project.dbPath)) {
      throw new UserError("The project file doesn't name a database file.")
    }
    remember(file, project.readOnly)
    return { path: file, project }
  })

  handle(projectChannels.save, projectSchemas.save, async ({ path, defaultName, tabs }) => {
    const target =
      path ??
      (await chooseSavePath(getWindow, {
        title: 'Save project',
        defaultPath: defaultName,
        filters: [PROJECT_FILTER, ALL_FILES],
        properties: SAVE_PROPERTIES,
      }))
    if (!target) return null
    const file = projectFileName(target)
    const db = await worker.call('db.projectInfo')
    try {
      saveProject(file, { ...emptyProject(), ...tabs, ...db })
    } catch (err) {
      throw new UserError(`Could not write the project file.\nReason: ${(err as Error).message}`, {
        cause: err,
      })
    }
    remember(file, db.readOnly)
    return file
  })
}
