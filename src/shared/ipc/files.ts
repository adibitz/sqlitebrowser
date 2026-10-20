import { z } from 'zod'
import type { RecentFile } from '../types/files'
import { bytesSchema } from './rows'

export const filesChannels = {
  showOpenDatabase: 'files:showOpenDatabase',
  showSaveDatabase: 'files:showSaveDatabase',
  recent: 'files:recent',
  clearRecent: 'files:clearRecent',
  revealInFolder: 'files:revealInFolder',
  saveText: 'files:saveText',
  openBinary: 'files:openBinary',
  saveBinary: 'files:saveBinary',
  openText: 'files:openText',
  writeText: 'files:writeText',
  openTextAt: 'files:openTextAt',
  chooseFolder: 'files:chooseFolder',
  chooseExtension: 'files:chooseExtension',
} as const

const fileFilter = z.object({ name: z.string().max(100), extensions: z.array(z.string().max(20)).max(10) })

export const filesSchemas = {
  showOpenDatabase: z.object({ title: z.string().max(200) }),
  showSaveDatabase: z.object({ title: z.string().max(200), defaultName: z.string().max(255).optional() }),
  recent: z.undefined(),
  clearRecent: z.undefined(),
  revealInFolder: z.object({ path: z.string().min(1).max(4096) }),
  saveText: z.object({
    title: z.string().max(200),
    defaultName: z.string().max(255),
    filters: z.array(fileFilter).max(10),
    content: z.string().max(512 * 1024 * 1024),
  }),
  openBinary: z.object({ title: z.string().max(200) }),
  saveBinary: z.object({
    title: z.string().max(200),
    defaultName: z.string().max(255),
    data: bytesSchema,
  }),
  openText: z.object({ title: z.string().max(200), filters: z.array(fileFilter).max(10) }),
  openTextAt: z.object({ path: z.string().min(1).max(4096) }),
  chooseFolder: z.object({ title: z.string().max(200), defaultPath: z.string().max(4096) }),
  chooseExtension: z.undefined(),
  writeText: z.object({ path: z.string().min(1).max(4096), content: z.string().max(512 * 1024 * 1024) }),
}

export interface FilesApi {
  /** Native open dialog for database files; null when cancelled. */
  showOpenDatabase(req: z.infer<typeof filesSchemas.showOpenDatabase>): Promise<string | null>
  /** Native save dialog; the returned path may then be passed to db.create / db.saveAs. */
  showSaveDatabase(req: z.infer<typeof filesSchemas.showSaveDatabase>): Promise<string | null>
  recent(): Promise<RecentFile[]>
  clearRecent(): Promise<void>
  revealInFolder(req: z.infer<typeof filesSchemas.revealInFolder>): Promise<void>
  /** Asks where to save, then writes `content` (UTF-8). Resolves to the path, or null when cancelled. */
  saveText(req: z.infer<typeof filesSchemas.saveText>): Promise<string | null>
  /** Asks for a file and returns its bytes (for BLOB cells), or null when cancelled. */
  openBinary(req: z.infer<typeof filesSchemas.openBinary>): Promise<{ name: string; data: Uint8Array } | null>
  /** Asks where to save, then writes the bytes. Resolves to the path, or null when cancelled. */
  saveBinary(req: z.infer<typeof filesSchemas.saveBinary>): Promise<string | null>
  /** Asks for a text file (UTF-8, BOM removed); the path may later be passed to writeText. */
  openText(
    req: z.infer<typeof filesSchemas.openText>,
  ): Promise<{ path: string; name: string; content: string } | null>
  /** Reads a text file dropped on the window (by its path from pathForFile). */
  openTextAt(
    req: z.infer<typeof filesSchemas.openTextAt>,
  ): Promise<{ path: string; name: string; content: string }>
  /** Writes a file the user opened or saved through a dialog earlier in this session. */
  writeText(req: z.infer<typeof filesSchemas.writeText>): Promise<void>
  /** Absolute path of a file dropped on the window (preload only, no IPC). */
  pathForFile(file: File): string
  /** A folder picked in a dialog, or null when cancelled. */
  chooseFolder(req: z.infer<typeof filesSchemas.chooseFolder>): Promise<string | null>
  /** An SQLite extension library picked in a dialog; only such paths may join 'extensions/list'. */
  chooseExtension(): Promise<string | null>
}
