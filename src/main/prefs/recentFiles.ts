import { statSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import type { RecentFile } from '@shared/types/files'
import type { PrefsDb } from './database'

export interface RecentFilesStore {
  /** Moves `path` to the top and trims the list to `max` entries. */
  add(path: string, readOnly: boolean, max: number): void
  list(): RecentFile[]
  clear(): void
}

interface RecentRow {
  path: string
  read_only: number
}

function describe(row: RecentRow): RecentFile {
  let size: number | null = null
  let modified: number | null = null
  let exists = false
  try {
    const st = statSync(row.path)
    exists = st.isFile()
    size = st.size
    modified = st.mtimeMs
  } catch {
    // Missing files stay in the list, shown as missing (like the Python start page).
  }
  return {
    path: row.path,
    name: basename(row.path),
    folder: dirname(row.path),
    exists,
    size,
    modified,
    readOnly: row.read_only === 1,
  }
}

export function createRecentFilesStore(db: PrefsDb): RecentFilesStore {
  const upsert = db.prepare<[string, string, number]>(
    `INSERT INTO recent_files (path, opened_at, read_only) VALUES (?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET opened_at = excluded.opened_at, read_only = excluded.read_only`,
  )
  const trim = db.prepare<[number]>(
    'DELETE FROM recent_files WHERE path NOT IN (SELECT path FROM recent_files ORDER BY opened_at DESC LIMIT ?)',
  )
  const select = db.prepare<[], RecentRow>('SELECT path, read_only FROM recent_files ORDER BY opened_at DESC')
  const clear = db.prepare('DELETE FROM recent_files')

  return {
    add(path, readOnly, max) {
      db.transaction(() => {
        upsert.run(path, new Date().toISOString(), readOnly ? 1 : 0)
        trim.run(max)
      })()
    },
    list: () => select.all().map(describe),
    clear: () => {
      clear.run()
    },
  }
}
