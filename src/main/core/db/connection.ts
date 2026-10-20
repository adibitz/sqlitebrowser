// Port of reference/sqliteview/core/db.py (open, create, close, save_as).
import { accessSync, constants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { escapeString } from '@shared/sqlb/identifier'
import { executeMultiSql } from './execute'
import { loadExtensionsFromSettings } from './extensions'
import { registerFunctions } from './functions'
import { setPragma } from './pragmas'
import { revertAll } from './savepoints'
import { updateSchema } from './schemaLoad'
import { isDirty, requireConn, type DbSession } from './session'

const MEMORY = ':memory:'

function setupConnection(session: DbSession, conn: Database.Database): void {
  conn.defaultSafeIntegers(true)
  registerFunctions(conn, session.options.disableRegex)
}

function isWritable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK)
    accessSync(dirname(path), constants.W_OK)
    return true
  } catch {
    return false
  }
}

/** Opens a database file. Throws with SQLite's message when it isn't a readable SQLite file. */
export function openDatabase(session: DbSession, path: string, readOnly = false): void {
  if (session.conn) closeDatabase(session, true)
  const isMemory = path === MEMORY
  let conn: Database.Database | null = null
  try {
    conn = new Database(path, { readonly: readOnly && !isMemory, fileMustExist: !isMemory })
    // Same probe as upstream tryEncryptionSettings(): is this a readable SQLite file?
    conn.prepare('SELECT COUNT(*) FROM sqlite_master;').get()
  } catch (err) {
    conn?.close()
    throw err instanceof Error ? err : new Error(String(err))
  }
  session.conn = conn
  setupConnection(session, conn)
  setPragma(session, 'foreign_keys', session.options.foreignKeys ? '1' : '0')
  session.readOnly = isMemory ? false : readOnly || !isWritable(resolve(path))
  loadExtensionsFromSettings(session)
  if (!session.readOnly && session.options.defaultSqlText) {
    executeMultiSql(session, session.options.defaultSqlText, { dirty: false, log: true })
  }
  session.curFile = path
  updateSchema(session)
}

/** Creates a new, empty database file and opens it. */
export function createDatabase(session: DbSession, path: string): void {
  if (session.conn) closeDatabase(session, true)
  const conn = new Database(path)
  try {
    const enc = session.options.defaultEncoding
    if (enc && !['UTF-8', 'UTF8', 'LATIN1'].includes(enc.toUpperCase())) {
      conn.exec(`PRAGMA encoding = ${escapeString(enc)};`)
    }
    // Forces SQLite to write a proper file header (same trick as upstream).
    conn.exec('CREATE TABLE notempty (id integer primary key); DROP TABLE notempty;')
  } finally {
    conn.close()
  }
  openDatabase(session, path)
}

/**
 * Closes the database. With pending changes this returns false unless `force` is set, in which case
 * they are rolled back.
 */
export function closeDatabase(session: DbSession, force = false): boolean {
  if (!session.conn) return true
  if (isDirty(session) && !force) return false
  if (isDirty(session)) revertAll(session)
  try {
    session.conn.close()
  } catch {
    // Closing a broken connection is not worth reporting.
  }
  session.conn = null
  session.curFile = ''
  session.readOnly = false
  session.schemata = new Map()
  session.savepoints = []
  session.events.dirtyChanged?.(false)
  session.events.structureUpdated?.()
  return true
}

/** Copies the database (including uncommitted changes) to `filename` and continues there. */
export async function saveDatabaseAs(session: DbSession, filename: string): Promise<void> {
  const conn = requireConn(session)
  await conn.backup(filename)
  conn.close()
  const dest = new Database(filename)
  session.conn = dest
  setupConnection(session, dest)
  session.curFile = filename
  session.savepoints = []
  session.events.dirtyChanged?.(false)
}

export function sqliteVersion(): string {
  const mem = new Database(MEMORY)
  try {
    return mem.prepare('SELECT sqlite_version()').pluck().get() as string
  } finally {
    mem.close()
  }
}
