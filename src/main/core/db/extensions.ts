// Port of reference/sqliteview/core/db.py (load_extension, load_extensions_from_settings).
import { existsSync } from 'node:fs'
import { requireConn, type DbSession } from './session'

export function loadExtension(session: DbSession, filePath: string): void {
  const conn = requireConn(session)
  if (!existsSync(filePath)) throw new Error('File not found.')
  conn.loadExtension(filePath)
}

/** Loads every extension from 'extensions/list'; failures become warnings, not errors. */
export function loadExtensionsFromSettings(session: DbSession): void {
  if (!session.conn) return
  for (const ext of session.options.extensions) {
    try {
      loadExtension(session, ext)
    } catch (err) {
      session.events.warning?.(`Error loading extension: ${(err as Error).message}`)
    }
  }
}
