import { z } from 'zod'
import type { DbState, LogEntry } from '../types/db'

export const dbChannels = {
  sqliteVersion: 'db:sqliteVersion',
  getState: 'db:getState',
  open: 'db:open',
  create: 'db:create',
  openMemory: 'db:openMemory',
  close: 'db:close',
  write: 'db:write',
  revert: 'db:revert',
  saveAs: 'db:saveAs',
  attach: 'db:attach',
  detach: 'db:detach',
  refreshSchema: 'db:refreshSchema',
} as const

/** Pushed from main to the renderer. */
export const dbEvents = {
  state: 'db:state',
  log: 'db:log',
  warning: 'db:warning',
} as const

const path = z.string().min(1).max(4096)
const schemaName = z.string().trim().min(1).max(128)

export const dbSchemas = {
  sqliteVersion: z.undefined(),
  getState: z.undefined(),
  open: z.object({ path, readOnly: z.boolean() }),
  create: z.object({ path }),
  openMemory: z.undefined(),
  close: z.undefined(),
  write: z.undefined(),
  revert: z.undefined(),
  saveAs: z.object({ path }),
  attach: z.object({ path, name: schemaName }),
  detach: z.object({ name: schemaName }),
  refreshSchema: z.undefined(),
}

export interface DbApi {
  /** SQLite library version, reported by the DB worker. */
  sqliteVersion(): Promise<string>
  getState(): Promise<DbState>
  /** Opens a file the user picked (dialog, recent list or drop). Adds it to the recent list. */
  open(req: z.infer<typeof dbSchemas.open>): Promise<DbState>
  /** Creates a database at a path chosen in the save dialog, replacing the file if it exists. */
  create(req: z.infer<typeof dbSchemas.create>): Promise<DbState>
  openMemory(): Promise<DbState>
  /** Closes without asking; pending changes are rolled back. Ask the user first. */
  close(): Promise<DbState>
  /** "Write Changes": commits every pending change. */
  write(): Promise<DbState>
  /** "Revert Changes": discards every pending change. */
  revert(): Promise<DbState>
  /** Copies the database to a path chosen in the save dialog and continues there. */
  saveAs(req: z.infer<typeof dbSchemas.saveAs>): Promise<DbState>
  attach(req: z.infer<typeof dbSchemas.attach>): Promise<DbState>
  detach(req: z.infer<typeof dbSchemas.detach>): Promise<DbState>
  /** Re-reads the schema (after changes made by another program). */
  refreshSchema(): Promise<DbState>

  onState(listener: (state: DbState) => void): () => void
  onLog(listener: (entries: LogEntry[]) => void): () => void
  onWarning(listener: (message: string) => void): () => void
}
