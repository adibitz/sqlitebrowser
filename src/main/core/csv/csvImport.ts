// Port of ImportCsvDialog.update_preview / _import_file: preview a CSV file, then insert it into a
// new or existing table inside one savepoint, batch by batch.
import { statSync } from 'node:fs'
import { basename } from 'node:path'
import { detectFields, TYPE_DETECTION_ROWS } from '@shared/csv/csvFields'
import type { ConflictAction, CsvReadOptions } from '@shared/csv/csvOptions'
import type { CsvPreview } from '@shared/ipc/io'
import { Field } from '@shared/sqlb/field'
import { escapeIdentifier, ObjectIdentifier } from '@shared/sqlb/identifier'
import type { Table } from '@shared/sqlb/table'
import type { SqlValue } from '@shared/types/values'
import { createTable } from '../db/alterTable'
import { logSql, querySingleValue } from '../db/execute'
import { generateSavepointName, revertToSavepoint, setSavepoint } from '../db/savepoints'
import { getTableByName, updateSchema } from '../db/schemaLoad'
import { requireConn, type DbSession } from '../db/session'
import { readCsv, readCsvHead } from './readCsv'

const PREVIEW_ROWS = 100

export function previewCsv(path: string, opts: CsvReadOptions): CsvPreview {
  const head = readCsvHead(path, opts, Math.max(TYPE_DETECTION_ROWS + 1, PREVIEW_ROWS + 1))
  const fields = detectFields(head, opts)
  const rows = head.slice(opts.header ? 1 : 0, (opts.header ? 1 : 0) + PREVIEW_ROWS)
  return { fields, rows, fileSize: statSync(path).size }
}

/** Values for empty fields when appending to an existing table (defaults are evaluated by SQLite). */
function emptyValues(session: DbSession, table: Table, ignoreDefaults: boolean): SqlValue[] {
  return table.fields.map((f) => {
    if (!ignoreDefaults && f.defaultValue) {
      return querySingleValue(session, `SELECT ${f.defaultValue}`, { log: false })
    }
    if (f.notNull) return f.isInteger() ? 0n : ''
    return null
  })
}

export interface ImportCsvRequest {
  path: string
  table: string
  options: CsvReadOptions
  conflict: ConflictAction
  ignoreDefaults: boolean
}

export function importCsv(session: DbSession, req: ImportCsvRequest): { rows: number } {
  const conn = requireConn(session)
  if (session.readOnly) throw new Error('The database is opened read-only.')
  const fields = detectFields(readCsvHead(req.path, req.options, TYPE_DETECTION_ROWS + 1), req.options)
  if (!fields.length) return { rows: 0 }

  const ident = new ObjectIdentifier('main', req.table)
  const existing = getTableByName(session, ident)
  if (existing && existing.fields.length !== fields.length) {
    throw new Error(
      `There is already a table named '${req.table}' with ${existing.fields.length} columns; ` +
        `the file has ${fields.length}. Data can only be added to a table with the same number of columns.`,
    )
  }

  const savepoint = generateSavepointName('csvimport')
  if (!setSavepoint(session, savepoint)) throw new Error('Creating a restore point failed.')
  const fail = (message: string, err: unknown): never => {
    revertToSavepoint(session, savepoint)
    updateSchema(session)
    throw new Error(`${message}: ${(err as Error).message}`, { cause: err })
  }
  if (!existing) {
    try {
      createTable(
        session,
        ident,
        fields.map((f) => new Field(f.name, f.type)),
      )
    } catch (err) {
      fail('Creating the table failed', err)
    }
  }
  const fill = existing ? emptyValues(session, existing, req.ignoreDefaults) : fields.map(() => null)
  const n = fields.length
  const sql =
    ['INSERT', req.conflict, 'INTO'].filter(Boolean).join(' ') +
    ` ${escapeIdentifier(req.table)} VALUES(${Array(n).fill('?').join(',')})`
  let done = 0
  try {
    const stmt = conn.prepare(sql)
    let skipHeader = req.options.header
    readCsv(req.path, req.options, (rows) => {
      for (const row of rows) {
        if (skipHeader) {
          skipHeader = false
          continue
        }
        const values: SqlValue[] = []
        for (let i = 0; i < n; i++) {
          const v = row[i] ?? ''
          values.push(v === '' ? (fill[i] ?? null) : v)
        }
        stmt.run(values)
        done++
      }
    })
  } catch (err) {
    fail(`Inserting row failed (around row ${done + 1})`, err)
  }
  logSql(session, `-- Imported ${basename(req.path)} into ${req.table}\n${sql}`)
  updateSchema(session)
  return { rows: done }
}
