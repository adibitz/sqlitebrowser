// What "Run", "Run current statement" and "Run line" execute (port of SqlTab.execute_all /
// execute_current / execute_line), and whether the run will commit pending changes.
import { iterStatements, statementAt } from '@shared/sql/sqlsplit'
import { needsCommitFirst } from '@shared/sql/statementType'
import type { RunKind } from './editor/SqlEditor'

export interface EditorPosition {
  text: string
  selection: { from: number; to: number } | null
  cursor: number
  line: { from: number; to: number }
}

/** [from, to) to execute, or null when there is nothing to run. */
export function runRange(kind: RunKind, pos: EditorPosition): { from: number; to: number } | null {
  let range: { from: number; to: number } | null
  if (kind === 'all') range = pos.selection ?? { from: 0, to: pos.text.length }
  else if (kind === 'line') range = pos.line
  else {
    const st = statementAt(pos.text, pos.cursor)
    range = st ? { from: st.start, to: st.end } : null
  }
  if (!range || !pos.text.slice(range.from, range.to).trim()) return null
  return range
}

/** True when a statement in the range is a PRAGMA assignment or VACUUM (they commit pending changes). */
export function commitsPendingChanges(text: string, from: number, to: number): boolean {
  for (const st of iterStatements(text, from, to)) if (needsCommitFirst(st.text)) return true
  return false
}

/** 1-based line number of an offset, for messages like "Error on line 3". */
export function lineOf(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') line++
  return line
}
