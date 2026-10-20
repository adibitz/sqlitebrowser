import { describe, expect, it } from 'vitest'
import { openPrefsDb } from '../../../../src/main/prefs/database'
import { createProviderStore, type SecretBox } from '../../../../src/main/prefs/providers'

// Stands in for the OS keychain (Electron safeStorage), which tests can't use.
function fakeSecretBox(available: boolean): SecretBox {
  return {
    canEncrypt: () => available,
    encrypt: (plain) => Buffer.from(`enc:${plain}`),
    decrypt: (cipher) => cipher.toString().replace(/^enc:/, ''),
  }
}

const claude = {
  kind: 'anthropic' as const,
  name: 'Claude',
  baseUrl: null,
  apiKey: 'sk-ant-test',
  defaultModel: 'claude-sonnet-5-5',
}

describe('provider store', () => {
  it('stores the API key encrypted and never in plain text', () => {
    const db = openPrefsDb(':memory:')
    const store = createProviderStore(db, fakeSecretBox(true))
    const saved = store.insert(claude)

    expect(saved).toMatchObject({ kind: 'anthropic', name: 'Claude', hasApiKey: true })
    expect(saved).not.toHaveProperty('apiKey')
    const raw = db.prepare('SELECT api_key FROM ai_providers WHERE id = ?').pluck().get(saved.id) as Buffer
    expect(raw.toString()).toBe('enc:sk-ant-test')
    expect(store.getApiKey(saved.id)).toBe('sk-ant-test')
  })

  it('keeps the key in memory only when the OS cannot encrypt', () => {
    const db = openPrefsDb(':memory:')
    const store = createProviderStore(db, fakeSecretBox(false))
    const saved = store.insert(claude)

    expect(db.prepare('SELECT api_key FROM ai_providers').pluck().get()).toBeNull()
    expect(saved.hasApiKey).toBe(true)
    expect(store.getApiKey(saved.id)).toBe('sk-ant-test')
    // A new session (fresh store on the same file) no longer has it.
    expect(createProviderStore(db, fakeSecretBox(false)).getApiKey(saved.id)).toBeNull()
  })

  it('saves a local server without a key', () => {
    const store = createProviderStore(openPrefsDb(':memory:'), fakeSecretBox(true))
    const saved = store.insert({
      kind: 'openai_compatible',
      name: 'localhost:11434',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: null,
      defaultModel: 'llama3.1',
    })
    expect(saved).toMatchObject({ baseUrl: 'http://localhost:11434/v1', hasApiKey: false })
    expect(store.list()).toHaveLength(1)
    expect(store.getApiKey(saved.id)).toBeNull()
  })

  it('returns null for an unknown provider', () => {
    const store = createProviderStore(openPrefsDb(':memory:'), fakeSecretBox(true))
    expect(store.getApiKey(42)).toBeNull()
  })
})
