// Port of ExportDataDialog._export: writes a table, a filtered table or a statement's rows to a file
// in one of the row formats. Rows stream from SQLite in batches; the file appears only when complete.
import { closeSync, openSync, renameSync, rmSync } from 'node:fs'
import { formatRows, type FormatOptions, type RowFormat } from '@shared/format/rowExport'
import type { ExportOptions, ExportSource } from '@shared/ipc/io'
import { escapeIdentifier, ObjectIdentifier } from '@shared/sqlb/identifier'
import type { SqlValue } from '@shared/types/values'
import { bufferedWriter } from './bufferedWriter'
import { requireConn, type DbSession } from './db/session'
import { buildBrowseQuery } from './rows'

const BATCH = 1000

function sourceQuery(session: DbSession, source: ExportSource): { sql: string; name: string } {
  if (source.kind === 'table') {
    const id = new ObjectIdentifier(source.ref.schema, source.ref.name)
    return { sql: `SELECT * FROM ${id.toString()}`, name: source.ref.name }
  }
  if (source.kind === 'browse') {
    const query = buildBrowseQuery(session, source.query)
    query.extraColumns = [] // the conditional format matches aren't data
    return { sql: query.buildQuery(false), name: source.query.table.name }
  }
  return { sql: source.sql, name: source.name }
}

/** Writes the rows of `source` to `path`; returns how many rows were written. */
export function exportToFile(
  session: DbSession,
  source: ExportSource,
  path: string,
  format: RowFormat,
  options: ExportOptions,
): number {
  const { sql, name } = sourceQuery(session, source)
  const stmt = requireConn(session).prepare(sql)
  if (!stmt.reader) throw new Error('This statement returns no rows to export.')
  const names = stmt.columns().map((c) => c.name)
  const formatOptions: FormatOptions = { ...options, table: name, escapeIdentifier }
  const tmp = path + '.part'
  const fd = openSync(tmp, 'w')
  let count = 0
  try {
    const out = bufferedWriter(fd)
    const rows = stmt.raw(true).iterate() as IterableIterator<SqlValue[]>
    if (format === 'json') {
      // One JSON document: collected first, like upstream.
      const all = [...rows]
      out.write(formatRows('json', names, all, formatOptions))
      count = all.length
    } else {
      let batch: SqlValue[][] = []
      let first = true
      const flush = (): void => {
        const header = first && (format === 'md' || options.header)
        if (batch.length || header) out.write(formatRows(format, names, batch, { ...formatOptions, header }))
        first = false
        count += batch.length
        batch = []
      }
      for (const row of rows) {
        batch.push(row)
        if (batch.length >= BATCH) flush()
      }
      flush()
    }
    out.flush()
  } catch (err) {
    closeSync(fd)
    rmSync(tmp, { force: true })
    throw err
  }
  closeSync(fd)
  renameSync(tmp, path)
  return count
}
