import { z } from 'zod'
import { CONFLICT_ACTIONS, type CsvReadOptions } from '../csv/csvOptions'
import type { CsvField } from '../csv/csvFields'
import { ROW_FORMATS } from '../format/rowExport'
import { browseQuerySchema } from './rows'

export const ioChannels = {
  chooseCsvFiles: 'io:chooseCsvFiles',
  previewCsv: 'io:previewCsv',
  importCsv: 'io:importCsv',
  exportData: 'io:exportData',
  exportSql: 'io:exportSql',
  chooseSqlFile: 'io:chooseSqlFile',
  importSql: 'io:importSql',
} as const

const path = z.string().min(1).max(4096)
const name = z.string().min(1).max(512)
const objectRef = z.object({ schema: name, name })
const oneChar = z.string().max(1)

export const csvReadOptionsSchema = z.object({
  separator: z.string().length(1),
  quote: oneChar,
  trim: z.boolean(),
  header: z.boolean(),
  sanitizeNames: z.boolean(),
  noTypeDetection: z.boolean(),
  encoding: z.string().min(1).max(64),
}) satisfies z.ZodType<CsvReadOptions>

export const exportSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('table'), ref: objectRef }),
  /** A table or view as filtered and sorted in its tab. */
  z.object({ kind: z.literal('browse'), query: browseQuerySchema }),
  /** The rows of a statement from the SQL editor. */
  z.object({
    kind: z.literal('sql'),
    sql: z
      .string()
      .min(1)
      .max(64 * 1024 * 1024),
    name,
  }),
])
export type ExportSource = z.infer<typeof exportSourceSchema>

export const exportOptionsSchema = z.object({
  header: z.boolean(),
  separator: oneChar,
  quote: oneChar,
  newline: z.enum(['\r\n', '\n']),
  prettyJson: z.boolean(),
})
export type ExportOptions = z.infer<typeof exportOptionsSchema>

const rowFormat = z.enum(
  Object.keys(ROW_FORMATS) as [keyof typeof ROW_FORMATS, ...(keyof typeof ROW_FORMATS)[]],
)

export const ioSchemas = {
  chooseCsvFiles: z.undefined(),
  previewCsv: z.object({ path, options: csvReadOptionsSchema }),
  importCsv: z.object({
    path,
    /** Created, or appended to when it exists with the same number of columns (main schema). */
    table: name,
    options: csvReadOptionsSchema,
    conflict: z.enum(CONFLICT_ACTIONS.map((c) => c.value) as [string, ...string[]]),
    /** Existing tables: empty fields get NULL / '' / 0 instead of the column default. */
    ignoreDefaults: z.boolean(),
  }),
  exportData: z.object({
    sources: z.array(exportSourceSchema).min(1).max(1000),
    format: rowFormat,
    options: exportOptionsSchema,
  }),
  exportSql: z.object({
    /** Suggested file name, e.g. the database's name with .sql. */
    defaultName: z.string().min(1).max(255),
    tables: z.array(name).min(1).max(10_000),
    insertColumnNames: z.boolean(),
    insertMultipleRows: z.boolean(),
    keepOriginal: z.boolean(),
    exportSchema: z.boolean(),
    exportData: z.boolean(),
    keepOldSchema: z.boolean(),
  }),
  chooseSqlFile: z.undefined(),
  importSql: z.object({ path }),
}

export interface CsvPreview {
  fields: CsvField[]
  /** The first data rows (after the header). */
  rows: string[][]
  fileSize: number
}

export interface IoApi {
  /** Open dialog for one or more CSV files; [] when cancelled. */
  chooseCsvFiles(): Promise<string[]>
  previewCsv(req: z.infer<typeof ioSchemas.previewCsv>): Promise<CsvPreview>
  /** Imports one file inside a savepoint; returns the number of rows read. */
  importCsv(req: z.infer<typeof ioSchemas.importCsv>): Promise<{ rows: number }>
  /** Asks where to save (a folder for several sources) and writes the files; null when cancelled. */
  exportData(req: z.infer<typeof ioSchemas.exportData>): Promise<{ files: string[] } | null>
  /** Asks where to save and dumps the tables as SQL; returns the path, or null when cancelled. */
  exportSql(req: z.infer<typeof ioSchemas.exportSql>): Promise<string | null>
  chooseSqlFile(): Promise<string | null>
  /** Runs an SQL file as one undoable change. */
  importSql(req: z.infer<typeof ioSchemas.importSql>): Promise<void>
}
