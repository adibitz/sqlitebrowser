import Database from 'better-sqlite3'
import { migrations } from './migrations'

export type PrefsDb = Database.Database

/** Opens (or creates) app.db and brings its schema up to date. Pass ':memory:' in tests. */
export function openPrefsDb(file: string): PrefsDb {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

export function migrate(db: PrefsDb): void {
  const current = db.pragma('user_version', { simple: true }) as number
  if (current > migrations.length) {
    throw new Error(`app.db is version ${current}, newer than this app supports (${migrations.length}).`)
  }
  for (let version = current; version < migrations.length; version++) {
    db.transaction(() => {
      db.exec(migrations[version]!)
      db.pragma(`user_version = ${version + 1}`)
    })()
  }
}
