import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { migrate, openPrefsDb } from '../../../../src/main/prefs/database'
import { migrations } from '../../../../src/main/prefs/migrations'

describe('openPrefsDb', () => {
  it('creates every table and sets user_version to the latest migration', () => {
    const db = openPrefsDb(':memory:')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .pluck()
      .all()
    expect(tables).toEqual(['recent_files', 'secrets', 'settings'])
    expect(db.pragma('user_version', { simple: true })).toBe(migrations.length)
  })

  it('is idempotent: migrating an up-to-date database changes nothing', () => {
    const db = openPrefsDb(':memory:')
    db.prepare("INSERT INTO settings (key, value) VALUES ('General/theme', '\"dark\"')").run()
    migrate(db)
    expect(db.prepare('SELECT COUNT(*) FROM settings').pluck().get()).toBe(1)
  })

  it('refuses a database written by a newer version of the app', () => {
    const db = openPrefsDb(':memory:')
    db.pragma(`user_version = ${migrations.length + 1}`)
    expect(() => migrate(db)).toThrow(/newer than this app/)
  })

  it('drops the chat tables and settings of version 1, keeping the rest', () => {
    const db = new Database(':memory:')
    db.exec(migrations[0]!)
    db.pragma('user_version = 1')
    db.exec(`
      INSERT INTO settings (key, value) VALUES ('General/theme', '"dark"'), ('ai/enabled', 'true');
      INSERT INTO ai_providers (kind, name, default_model) VALUES ('anthropic', 'Claude', 'm');
      INSERT INTO recent_files (path, opened_at) VALUES ('/a.db', 'now');
    `)
    migrate(db)
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all()
    expect(tables).not.toContain('ai_providers')
    expect(tables).not.toContain('chat_messages')
    expect(db.prepare('SELECT key FROM settings').pluck().all()).toEqual(['General/theme'])
    expect(db.prepare('SELECT path FROM recent_files').pluck().all()).toEqual(['/a.db'])
  })
})
