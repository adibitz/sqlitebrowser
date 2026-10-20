// Port of MainWindow.import_sql: runs an SQL file as one undoable change.
import { readFileSync, statSync } from 'node:fs'
import { stripBom } from '@shared/format/data'
import { executeMultiSql } from './db/execute'
import type { DbSession } from './db/session'

const MAX_SQL_FILE = 1024 * 1024 * 1024

export function importSqlFile(session: DbSession, path: string): void {
  if (session.readOnly) throw new Error('The database is opened read-only.')
  if (statSync(path).size > MAX_SQL_FILE) throw new Error('That file is larger than 1 GB.')
  const sql = stripBom(readFileSync(path, 'utf8'))
  executeMultiSql(session, sql, { dirty: true, log: false })
}
