// Chats kept in app.db, one conversation per database file (chat_sessions / chat_messages).
import type { ChatMessage } from '../ai/chat/messages'
import type { PrefsDb } from './database'

export interface ChatHistoryStore {
  /** The most recent conversation about `dbPath`, if any. */
  latestSession(dbPath: string): number | null
  /** A new conversation; `dbPath` null for in-memory databases. */
  createSession(dbPath: string | null, providerId: number | null, model: string): number
  messages(sessionId: number): ChatMessage[]
  add(sessionId: number, message: ChatMessage): void
  /** Forgets every conversation about `dbPath`. */
  clear(dbPath: string): void
  deleteSession(sessionId: number): void
}

export function createChatHistoryStore(db: PrefsDb): ChatHistoryStore {
  const latest = db.prepare<[string], { id: number }>(
    'SELECT id FROM chat_sessions WHERE db_path = ? ORDER BY updated_at DESC, id DESC LIMIT 1',
  )
  const insertSession = db.prepare<[string | null, number | null, string, string, string]>(
    'INSERT INTO chat_sessions (db_path, provider_id, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
  const selectMessages = db.prepare<[number], { role: string; content: string }>(
    'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id',
  )
  const insertMessage = db.prepare<[number, string, string, string]>(
    'INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)',
  )
  const touch = db.prepare<[string, number]>('UPDATE chat_sessions SET updated_at = ? WHERE id = ?')
  const clearPath = db.prepare<[string]>('DELETE FROM chat_sessions WHERE db_path = ?')
  const deleteOne = db.prepare<[number]>('DELETE FROM chat_sessions WHERE id = ?')
  const now = (): string => new Date().toISOString()

  return {
    latestSession: (dbPath) => latest.get(dbPath)?.id ?? null,

    createSession(dbPath, providerId, model) {
      const at = now()
      return Number(insertSession.run(dbPath, providerId, model, at, at).lastInsertRowid)
    },

    messages: (sessionId) =>
      selectMessages.all(sessionId).flatMap((row): ChatMessage[] => {
        try {
          return [{ role: row.role, ...JSON.parse(row.content) } as ChatMessage]
        } catch {
          return [] // a damaged row is skipped rather than breaking the whole chat
        }
      }),

    add(sessionId, message) {
      const { role, ...content } = message
      const at = now()
      db.transaction(() => {
        insertMessage.run(sessionId, role, JSON.stringify(content), at)
        touch.run(at, sessionId)
      })()
    },

    clear: (dbPath) => void clearPath.run(dbPath),
    deleteSession: (sessionId) => void deleteOne.run(sessionId),
  }
}
