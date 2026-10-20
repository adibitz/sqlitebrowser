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
    expect(tables).toEqual(['ai_providers', 'chat_messages', 'chat_sessions', 'recent_files', 'settings'])
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

  it('enforces foreign keys so chat messages need a session', () => {
    const db = openPrefsDb(':memory:')
    expect(() =>
      db
        .prepare(
          "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (99, 'user', '{}', 'now')",
        )
        .run(),
    ).toThrow(/FOREIGN KEY/)
  })
})
