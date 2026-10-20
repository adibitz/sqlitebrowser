// Port of reference/sqliteview/core/db.py (savepoints). Every change is wrapped in a SAVEPOINT;
// nothing reaches the file until releaseAllSavepoints ("Write Changes").
import { escapeIdentifier, ObjectIdentifier } from '@shared/sqlb/identifier'
import { executeSql } from './execute'
import { getTableByName } from './schemaLoad'
import { isDirty, type DbSession } from './session'

export const RESTOREPOINT = 'RESTOREPOINT'
const UNDOPOINT = 'UNDOPOINT'

function notifyDirty(session: DbSession): void {
  session.events.dirtyChanged?.(isDirty(session))
}

function dropFrom(session: DbSession, name: string): void {
  session.savepoints.splice(session.savepoints.lastIndexOf(name))
}

/** Returns false when there's nothing to protect (no database, or read-only). */
export function setSavepoint(session: DbSession, name = RESTOREPOINT, unique = true): boolean {
  if (!session.conn || session.readOnly) return false
  if (unique && session.savepoints.includes(name)) return true
  executeSql(session, `SAVEPOINT ${escapeIdentifier(name)};`, { dirty: false, log: true })
  session.savepoints.push(name)
  notifyDirty(session)
  return true
}

export function releaseSavepoint(session: DbSession, name = RESTOREPOINT): void {
  if (!session.conn || !session.savepoints.includes(name)) return
  executeSql(session, `RELEASE ${escapeIdentifier(name)};`, { dirty: false, log: true })
  dropFrom(session, name)
  notifyDirty(session)
}

export function revertToSavepoint(session: DbSession, name = RESTOREPOINT): boolean {
  if (!session.conn || !session.savepoints.includes(name)) return false
  executeSql(session, `ROLLBACK TO SAVEPOINT ${escapeIdentifier(name)};`, { dirty: false, log: true })
  executeSql(session, `RELEASE ${escapeIdentifier(name)};`, { dirty: false, log: true })
  dropFrom(session, name)
  notifyDirty(session)
  return true
}

/** "Write Changes": releases every savepoint and commits. */
export function releaseAllSavepoints(session: DbSession): void {
  if (!session.conn) return
  while (session.savepoints.length) releaseSavepoint(session, session.savepoints[0])
  if (session.conn.inTransaction) executeSql(session, 'COMMIT;', { dirty: false, log: true })
}

/** "Revert Changes". */
export function revertAll(session: DbSession): void {
  while (session.savepoints.length) revertToSavepoint(session, session.savepoints[0])
}

export const setUndoSavepoint = (session: DbSession): boolean => setSavepoint(session, UNDOPOINT, false)
export const revertToUndoSavepoint = (session: DbSession): boolean => revertToSavepoint(session, UNDOPOINT)
export const releaseUndoSavepoint = (session: DbSession): void => releaseSavepoint(session, UNDOPOINT)

export function generateSavepointName(identifier = ''): string {
  return `db4s_${identifier}_${process.hrtime.bigint()}`
}

export function generateTemporaryTableName(session: DbSession, schema: string): string {
  for (;;) {
    session.tempCounter++
    const name = `sqlb_temp_table_${session.tempCounter}`
    if (!getTableByName(session, new ObjectIdentifier(schema, name))) return name
  }
}
