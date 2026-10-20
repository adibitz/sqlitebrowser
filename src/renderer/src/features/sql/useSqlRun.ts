import { useState, type RefObject } from 'react'
import type { StatementOutcome } from '@shared/ipc/sql'
import type { SqlValue } from '@shared/types/values'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { confirm } from '@/store/dialogs'
import type { RunKind, SqlEditorHandle } from './editor/SqlEditor'
import type { RangeMark } from './editor/marks'
import { commitsPendingChanges, lineOf, runRange } from './runRange'

export interface RunMessage {
  text: string
  error: boolean
}

/** What the result pane shows after a run. */
export type ResultSource =
  | { kind: 'query'; sql: string; columns: string[] }
  | { kind: 'static'; columns: string[]; rows: SqlValue[][] }

function snippet(text: string, from: number, to: number): string {
  return text.slice(from, to).split(/\s+/).join(' ').trim().slice(0, 80)
}

/** Runs editor contents through the worker (port of SqlTab._execute and its signal handlers). */
export function useSqlRun(editor: RefObject<SqlEditorHandle | null>) {
  const [running, setRunning] = useState(false)
  const [messages, setMessages] = useState<RunMessage[]>([])
  const [result, setResult] = useState<ResultSource | null>(null)
  const [runId, setRunId] = useState(0)

  const run = async (kind: RunKind): Promise<void> => {
    const ed = editor.current
    const { state, bumpDataVersion } = useDbStore.getState()
    if (!ed || running || !state.isOpen) return
    const text = ed.getText()
    const range = runRange(kind, {
      text,
      selection: ed.getSelection(),
      cursor: ed.getCursor(),
      line: ed.getLineRange(),
    })
    if (!range) return

    let commitConfirmed = false
    if (state.dirty && commitsPendingChanges(text, range.from, range.to)) {
      const choice = await confirm({
        title: 'Commit pending changes?',
        description: 'Setting PRAGMA values or vacuuming will commit your current changes first.',
        actions: [{ id: 'commit', label: 'Commit and run' }],
      })
      if (choice !== 'commit') return
      commitConfirmed = true
    }

    ed.setMarks([])
    setRunning(true)
    setResult(null)
    const started = performance.now()
    const out: RunMessage[] = []
    const marks: RangeMark[] = []
    let last: ResultSource | null = null
    try {
      const res = await api.sql.execute({ text, from: range.from, to: range.to, commitConfirmed })
      for (const o of res.outcomes as StatementOutcome[]) {
        if (o.kind === 'error') {
          marks.push({ from: o.start, to: o.end, kind: 'error' })
          out.push({ text: `Error on line ${lineOf(text, o.start)}: ${o.message}`, error: true })
          continue
        }
        marks.push({ from: o.start, to: o.end, kind: 'executed' })
        if (o.kind === 'executed')
          out.push({ text: `${o.message}\n   ${snippet(text, o.start, o.end)}`, error: false })
        else if (o.kind === 'static') {
          out.push({ text: o.message, error: false })
          last = { kind: 'static', columns: o.columns, rows: o.rows }
        } else {
          last = { kind: 'query', sql: o.sql, columns: o.columns }
          out.push({ text: `Query returned rows (prepared in ${o.ms} ms)`, error: false })
        }
      }
      if (res.modified) bumpDataVersion()
    } catch (err) {
      out.push({ text: errorMessage(err), error: true })
    } finally {
      out.push({ text: `Execution finished in ${Math.round(performance.now() - started)} ms`, error: false })
      ed.setMarks(marks)
      setMessages(out)
      setResult(last)
      setRunId((n) => n + 1)
      setRunning(false)
    }
  }

  return { run, running, messages, result, runId }
}
