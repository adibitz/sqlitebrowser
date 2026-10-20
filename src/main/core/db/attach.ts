// Port of reference/sqliteview/core/db.py (attach, detach, attached_databases).
import { escapeIdentifier, escapeString } from '@shared/sqlb/identifier'
import { executeSql, logSql, runStatement } from './execute'
import { updateSchema } from './schemaLoad'
import { requireConn, type DbSession } from './session'

export function attachDatabase(session: DbSession, filePath: string, attachAs: string): void {
  requireConn(session)
  if (!attachAs) throw new Error('Enter a name for the attached database.')
  executeSql(session, `ATTACH ${escapeString(filePath)} AS ${escapeIdentifier(attachAs)}`, { dirty: false })
  updateSchema(session)
}

export function detachDatabase(session: DbSession, attachedAs: string): void {
  requireConn(session)
  executeSql(session, `DETACH ${escapeIdentifier(attachedAs)};`, { dirty: false })
  updateSchema(session)
}

/** [schema, file] of every attached database except main and temp (as stored in project files). */
export function attachedDatabases(session: DbSession): [string, string][] {
  if (!session.conn) return []
  logSql(session, 'PRAGMA database_list;')
  const rows = runStatement(session, 'PRAGMA database_list;').rows ?? []
  return rows
    .map((r) => [String(r[1]), (r[2] as string | null) ?? ''] as [string, string])
    .filter(([schema]) => schema !== 'main' && schema !== 'temp')
}
