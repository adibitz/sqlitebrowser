import { statSync } from 'node:fs'
import { isAbsolute, normalize } from 'node:path'
import { UserError } from './errors'

/** Paths the user chose in a save dialog this session; only these may be created or overwritten. */
const approvedSavePaths = new Set<string>()

export function approveSavePath(path: string): void {
  approvedSavePaths.add(normalize(path))
}

/** Text files the user opened or saved through a dialog; they may be written again (Save). */
const writableTextPaths = new Set<string>()

export function allowTextWrites(path: string): void {
  writableTextPaths.add(normalize(path))
}

export function requireWritableText(path: string): string {
  const p = normalize(path)
  if (!writableTextPaths.has(p)) throw new UserError('Choose where to save the file first.')
  return p
}

/** Throws unless the user picked this path in a save dialog. Each approval is used once. */
export function consumeSavePath(path: string): string {
  const p = normalize(path)
  if (!approvedSavePaths.delete(p)) throw new UserError('Choose where to save the file first.')
  return p
}

/** Extension libraries the user picked in a dialog this session. */
const approvedExtensions = new Set<string>()

export function approveExtensionPath(path: string): void {
  approvedExtensions.add(normalize(path))
}

/**
 * 'extensions/list' makes the DB worker load native code, so a new list may only add libraries the
 * user picked in the dialog; entries already in the list may stay or go.
 */
export function requireApprovedExtensions(next: readonly string[], current: readonly string[]): void {
  const known = new Set(current.map(normalize))
  const unknown = next.find((p) => !known.has(normalize(p)) && !approvedExtensions.has(normalize(p)))
  if (unknown !== undefined) throw new UserError(`Choose ${unknown} in the extension dialog first.`)
}

/** An absolute path to an existing file, as reported by a dialog, the recent list or a drop. */
export function requireExistingFile(path: string): string {
  if (!isAbsolute(path)) throw new UserError('That file path is not valid.')
  const p = normalize(path)
  let isFile: boolean
  try {
    isFile = statSync(p).isFile()
  } catch {
    isFile = false
  }
  if (!isFile) throw new UserError(`The file ${p} doesn't exist any more.`)
  return p
}
