/**
 * Schema of app.db, one entry per version (index 0 = version 1). Append only: never edit a shipped entry.
 */
export const migrations: readonly string[] = [
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE recent_files (
    path      TEXT PRIMARY KEY,
    opened_at TEXT NOT NULL,
    read_only INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE ai_providers (
    id            INTEGER PRIMARY KEY,
    kind          TEXT NOT NULL CHECK (kind IN ('anthropic', 'openai_compatible')),
    name          TEXT NOT NULL,
    base_url      TEXT,
    api_key       BLOB,
    default_model TEXT NOT NULL
  );
  CREATE TABLE chat_sessions (
    id          INTEGER PRIMARY KEY,
    db_path     TEXT,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL,
    model       TEXT NOT NULL,
    title       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE TABLE chat_messages (
    id         INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX chat_sessions_db_path ON chat_sessions(db_path);
  CREATE INDEX chat_messages_session ON chat_messages(session_id);
  `,
]
