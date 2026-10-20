import { join } from 'node:path'
import { ROW_FORMAT_EXTENSIONS, ROW_FORMATS } from '@shared/format/rowExport'
import { ioChannels, ioSchemas, type ExportSource } from '@shared/ipc/io'
import { requireExistingFile } from '../pathChecks'
import type { DbWorker } from '../worker/rpc'
import { ALL_FILES, defaultFolder, SAVE_PROPERTIES, type FilesIpcDeps } from './files'
import { handle } from './handle'
import { chooseOpenPaths, chooseSavePath } from './nativeDialogs'

export type IoIpcDeps = FilesIpcDeps & { worker: DbWorker }

const CSV_FILTERS: Electron.FileFilter[] = [
  { name: 'CSV files', extensions: ['csv', 'tsv', 'txt', 'dat'] },
  ALL_FILES,
]
const SQL_FILTERS: Electron.FileFilter[] = [
  { name: 'SQL files', extensions: ['sql'] },
  { name: 'Text files', extensions: ['txt'] },
  ALL_FILES,
]

function sourceName(source: ExportSource): string {
  if (source.kind === 'table') return source.ref.name
  if (source.kind === 'browse') return source.query.table.name
  return source.name
}

/** A file name without the characters Windows refuses. */
function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'export'
}

/** Import and export: the dialogs open here, the work runs in the DB worker. */
export function registerIoIpc(deps: IoIpcDeps): void {
  const { getWindow, worker } = deps

  handle(ioChannels.chooseCsvFiles, ioSchemas.chooseCsvFiles, () =>
    chooseOpenPaths(getWindow, {
      title: 'Import CSV',
      defaultPath: defaultFolder(deps),
      properties: ['openFile', 'multiSelections'],
      filters: CSV_FILTERS,
    }),
  )

  handle(ioChannels.previewCsv, ioSchemas.previewCsv, ({ path, options }) =>
    worker.call('io.previewCsv', { path: requireExistingFile(path), options }),
  )

  handle(ioChannels.importCsv, ioSchemas.importCsv, (req) =>
    worker.call('io.importCsv', {
      ...req,
      path: requireExistingFile(req.path),
      conflict: req.conflict as '' | 'OR IGNORE' | 'OR REPLACE',
    }),
  )

  handle(ioChannels.exportData, ioSchemas.exportData, async ({ sources, format, options }) => {
    const ext = ROW_FORMAT_EXTENSIONS[format]
    let paths: string[]
    if (sources.length === 1) {
      const path = await chooseSavePath(getWindow, {
        title: 'Export data',
        defaultPath: `${safeFileName(sourceName(sources[0]!))}.${ext}`,
        filters: [{ name: ROW_FORMATS[format], extensions: [ext] }, ALL_FILES],
        properties: SAVE_PROPERTIES,
      })
      if (!path) return null
      paths = [path]
    } else {
      const [folder] = await chooseOpenPaths(getWindow, {
        title: 'Choose a folder for the exported files',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (!folder) return null
      paths = sources.map((s) => join(folder, `${safeFileName(sourceName(s))}.${ext}`))
    }
    const jobs = sources.map((source, i) => ({ source, path: paths[i]! }))
    await worker.call('io.exportData', { jobs, format, options })
    return { files: paths }
  })

  handle(ioChannels.exportSql, ioSchemas.exportSql, async ({ defaultName, ...options }) => {
    const path = await chooseSavePath(getWindow, {
      title: 'Export SQL',
      defaultPath: safeFileName(defaultName),
      filters: SQL_FILTERS,
      properties: SAVE_PROPERTIES,
    })
    if (!path) return null
    await worker.call('io.exportSql', { path, options })
    return path
  })

  handle(ioChannels.chooseSqlFile, ioSchemas.chooseSqlFile, async () => {
    const [path] = await chooseOpenPaths(getWindow, {
      title: 'Import SQL file',
      properties: ['openFile'],
      filters: SQL_FILTERS,
    })
    return path ?? null
  })

  handle(ioChannels.importSql, ioSchemas.importSql, ({ path }) =>
    worker.call('io.importSql', { path: requireExistingFile(path) }),
  )
}
