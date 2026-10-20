// Port of the path and file parts of reference/sqliteview/core/project.py.
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { stripBom } from '@shared/format/data'
import { projectFromXml, projectToXml, type Project } from '@shared/project/sqbpro'
import { MEMORY_DATABASE } from '@shared/types/db'

const sameFolder = (a: string, b: string): boolean => {
  const fold = (p: string): string => (process.platform === 'win32' ? p.toLowerCase() : p)
  return fold(dirname(resolve(a))) === fold(dirname(resolve(b)))
}

/** Upstream stores just the file name when the database sits next to the project. */
export function storedDbPath(dbPath: string, projectPath: string): string {
  if (dbPath === MEMORY_DATABASE) return dbPath
  return sameFolder(dbPath, projectPath) ? basename(dbPath) : dbPath
}

/** Upstream: a relative path is taken relative to the project's folder; absolute paths stay. */
export function resolveDbPath(dbPath: string, projectPath: string): string {
  if (!dbPath || dbPath === MEMORY_DATABASE) return dbPath
  return resolve(dirname(resolve(projectPath)), dbPath)
}

/** Reads a project file. Throws ProjectError (or the file system's error). */
export function loadProject(path: string): Project {
  const project = projectFromXml(stripBom(readFileSync(path, 'utf8')))
  return {
    ...project,
    dbPath: resolveDbPath(project.dbPath, path),
    attached: project.attached.map(([schema, file]) => [schema, resolveDbPath(file, path)]),
  }
}

/** Writes the project, replacing the file only once it is complete (upstream uses QSaveFile). */
export function saveProject(path: string, project: Project): void {
  const tmp = path + '.tmp'
  try {
    writeFileSync(tmp, projectToXml({ ...project, dbPath: storedDbPath(project.dbPath, path) }), 'utf8')
    renameSync(tmp, path)
  } finally {
    rmSync(tmp, { force: true })
  }
}
