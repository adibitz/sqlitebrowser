import { describe, expect, it } from 'vitest'
import { createMcpToken } from '../../../../src/main/mcp/token'
import { openPrefsDb } from '../../../../src/main/prefs/database'
import { createSecretValueStore } from '../../../../src/main/prefs/secretValues'
import type { SecretBox } from '../../../../src/main/secrets'

// Stands in for the OS keychain (Electron safeStorage), which tests can't use.
function fakeSecretBox(available: boolean): SecretBox {
  return {
    canEncrypt: () => available,
    encrypt: (plain) => Buffer.from(`enc:${plain}`),
    decrypt: (cipher) => cipher.toString().replace(/^enc:/, ''),
  }
}

describe('secret value store', () => {
  it('stores values encrypted and reads them back', () => {
    const db = openPrefsDb(':memory:')
    const store = createSecretValueStore(db, fakeSecretBox(true))
    store.set('k', 'secret')
    store.set('k', 'newer')
    expect(db.prepare('SELECT value FROM secrets').pluck().all().map(String)).toEqual(['enc:newer'])
    expect(store.get('k')).toBe('newer')
    expect(store.get('missing')).toBeNull()
  })

  it('keeps values in memory only when the OS cannot encrypt', () => {
    const db = openPrefsDb(':memory:')
    const store = createSecretValueStore(db, fakeSecretBox(false))
    store.set('k', 'secret')
    expect(db.prepare('SELECT COUNT(*) FROM secrets').pluck().get()).toBe(0)
    expect(store.get('k')).toBe('secret')
  })
})

describe('MCP token', () => {
  it('is made once, kept across restarts, and replaced on demand', () => {
    const db = openPrefsDb(':memory:')
    const box = fakeSecretBox(true)
    const first = createMcpToken(createSecretValueStore(db, box)).get()
    expect(first).toMatch(/^[\w-]{43}$/)
    const again = createMcpToken(createSecretValueStore(db, box))
    expect(again.get()).toBe(first)
    const next = again.regenerate()
    expect(next).not.toBe(first)
    expect(createMcpToken(createSecretValueStore(db, box)).get()).toBe(next)
  })
})
