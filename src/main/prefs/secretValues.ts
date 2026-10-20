import type { SecretBox } from '../secrets'
import type { PrefsDb } from './database'

/** Named secrets (the MCP token), encrypted in app.db. */
export interface SecretValueStore {
  get(name: string): string | null
  set(name: string, value: string): void
}

export function createSecretValueStore(db: PrefsDb, box: SecretBox): SecretValueStore {
  // Values that can't be encrypted are kept for this session only, never written in plain text.
  const sessionValues = new Map<string, string>()
  const select = db.prepare<[string], { value: Buffer }>('SELECT value FROM secrets WHERE name = ?')
  const upsert = db.prepare<[string, Buffer]>(
    'INSERT INTO secrets (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value',
  )

  return {
    get(name) {
      if (sessionValues.has(name)) return sessionValues.get(name)!
      const row = select.get(name)
      return row ? box.decrypt(row.value) : null
    },
    set(name, value) {
      if (box.canEncrypt()) upsert.run(name, box.encrypt(value))
      else sessionValues.set(name, value)
    },
  }
}
