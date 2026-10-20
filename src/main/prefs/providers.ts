import type { ProviderKind, ProviderSummary } from '@shared/ai/providers'
import type { SaveProviderRequest } from '@shared/ipc/ai'
import type { PrefsDb } from './database'

/** Encrypts API keys at rest. `canEncrypt()` is false when the OS offers no secure storage. */
export interface SecretBox {
  canEncrypt(): boolean
  encrypt(plain: string): Buffer
  decrypt(cipher: Buffer): string
}

export interface ProviderStore {
  list(): ProviderSummary[]
  insert(req: SaveProviderRequest): ProviderSummary
  getApiKey(id: number): string | null
  get(id: number): ProviderSummary | null
  remove(id: number): void
}

interface ProviderRow {
  id: number
  kind: ProviderKind
  name: string
  base_url: string | null
  api_key: Buffer | null
  default_model: string
}

export function createProviderStore(db: PrefsDb, secrets: SecretBox): ProviderStore {
  // Keys that can't be encrypted are kept for this session only, never written in plain text.
  const sessionKeys = new Map<number, string>()

  const selectAll = db.prepare<[], ProviderRow>('SELECT * FROM ai_providers ORDER BY id')
  const selectOne = db.prepare<[number], ProviderRow>('SELECT * FROM ai_providers WHERE id = ?')
  const remove = db.prepare<[number]>('DELETE FROM ai_providers WHERE id = ?')
  const insert = db.prepare<[ProviderKind, string, string | null, Buffer | null, string]>(
    'INSERT INTO ai_providers (kind, name, base_url, api_key, default_model) VALUES (?, ?, ?, ?, ?)',
  )

  function toSummary(row: ProviderRow): ProviderSummary {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      baseUrl: row.base_url,
      defaultModel: row.default_model,
      hasApiKey: row.api_key !== null || sessionKeys.has(row.id),
    }
  }

  return {
    list: () => selectAll.all().map(toSummary),

    insert(req) {
      const key = req.apiKey || null
      const stored = key && secrets.canEncrypt() ? secrets.encrypt(key) : null
      const { lastInsertRowid } = insert.run(req.kind, req.name, req.baseUrl, stored, req.defaultModel)
      const id = Number(lastInsertRowid)
      if (key && !stored) sessionKeys.set(id, key)
      return toSummary(selectOne.get(id)!)
    },

    get(id) {
      const row = selectOne.get(id)
      return row ? toSummary(row) : null
    },

    remove(id) {
      remove.run(id)
      sessionKeys.delete(id)
    },

    getApiKey(id) {
      const row = selectOne.get(id)
      if (!row) return null
      if (row.api_key) return secrets.decrypt(row.api_key)
      return sessionKeys.get(id) ?? null
    },
  }
}
