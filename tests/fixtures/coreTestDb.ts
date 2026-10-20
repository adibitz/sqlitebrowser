import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach } from 'vitest'
import { closeDatabase, openDatabase } from '../../src/main/core/db/connection'
import { createSession, type DbOptions, type DbSession } from '../../src/main/core/db/session'
import { tempDir } from './tempDir'

/** The schema used by the Python engine tests (tests/test_core.py `db` fixture). */
export const CORE_TEST_SCHEMA = `
  CREATE TABLE parent(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'x' COLLATE NOCASE);
  CREATE TABLE child(
      id integer NOT NULL,
      parent_id INTEGER REFERENCES parent(id) ON DELETE CASCADE,
      "weird ""name""" varchar(20) UNIQUE CHECK(length("weird ""name""") < 10),
      total REAL GENERATED ALWAYS AS (id * 2) STORED,
      PRIMARY KEY(id)
  );
  CREATE INDEX idx_child_parent ON child(parent_id DESC);
  CREATE VIEW v_parent AS SELECT * FROM parent;
  CREATE TRIGGER trg AFTER INSERT ON parent BEGIN SELECT 1; END;
  CREATE TABLE wr(a TEXT, b INT, c BLOB, PRIMARY KEY(a, b)) WITHOUT ROWID;
  INSERT INTO parent(name) VALUES ('alice'), ('bob'), ('carl');
`

const open: DbSession[] = []

afterEach(() => {
  for (const s of open.splice(0)) closeDatabase(s, true)
})

/** Writes a database file with `sql` into a temp folder and returns its path. */
export function makeDbFile(sql: string, name = 'test.db'): string {
  const path = join(tempDir(), name)
  const con = new Database(path)
  con.exec(sql)
  con.close()
  return path
}

/** An engine session opened on a fresh copy of the core test database (closed after the test). */
export function openCoreTestDb(options: Partial<DbOptions> = {}): DbSession {
  const session = createSession(options)
  openDatabase(session, makeDbFile(CORE_TEST_SCHEMA))
  open.push(session)
  return session
}
