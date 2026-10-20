import type { RowFormat } from '@shared/format/rowExport'
import type { CsvPreview, ExportOptions, ExportSource } from '@shared/ipc/io'
import type { CsvReadOptions } from '@shared/csv/csvOptions'
import { importCsv, previewCsv, type ImportCsvRequest } from '../../core/csv/csvImport'
import { dumpDatabase, type DumpOptions } from '../../core/db/dump'
import { exportToFile } from '../../core/exportData'
import { importSqlFile } from '../../core/importSql'
import { session } from '../session'

export interface ExportJob {
  source: ExportSource
  path: string
}

export const ioHandlers = {
  'io.previewCsv': (req: { path: string; options: CsvReadOptions }): CsvPreview =>
    previewCsv(req.path, req.options),

  'io.importCsv': (req: ImportCsvRequest): { rows: number } => importCsv(session, req),

  'io.exportData': (req: { jobs: ExportJob[]; format: RowFormat; options: ExportOptions }): number[] =>
    req.jobs.map((job) => exportToFile(session, job.source, job.path, req.format, req.options)),

  'io.exportSql': (req: { path: string; options: Omit<DumpOptions, 'progress'> }): void =>
    dumpDatabase(session, req.path, req.options),

  'io.importSql': (req: { path: string }): void => importSqlFile(session, req.path),
}
