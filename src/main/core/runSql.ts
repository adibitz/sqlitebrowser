// Port of reference/sqliteview/core/runsql.py (RunSql._execute): runs the statements of the SQL editor.
// A restore point is set before the first modifying statement (so Revert undoes the run) and released
// again when nothing changed. PRAGMA assignments and VACUUM commit pending changes first; the UI asks
// beforehand and passes `commitConfirmed`. Row-returning statements are only prepared here; the result
// grid pages through them (see queryRows.ts).
import { iterStatements } from '@shared/sql/sqlsplit'
import {
  changesStructure,
  isTransactionControl,
  needsCommitFirst,
  returnsRows,
  statementType,
} from '@shared/sql/statementType'
import type { RunResult, StatementOutcome } from '@shared/ipc/sql'
import type { SqlValue } from '@shared/types/values'
import { logSql } from './db/execute'
import {
  releaseAllSavepoints,
  releaseSavepoint,
  releaseUndoSavepoint,
  setSavepoint,
  setUndoSavepoint,
} from './db/savepoints'
import { updateSchema } from './db/schemaLoad'
import { isDirty, LogMessageType, requireConn, type DbSession } from './db/session'

export interface RunOptions {
  /** The user agreed that PRAGMA/VACUUM may commit pending changes. */
  commitConfirmed: boolean
}

export function runSqlScript(
  session: DbSession,
  text: string,
  from: number,
  to: number,
  opts: RunOptions,
): RunResult {
  const conn = requireConn(session)
  const outcomes: StatementOutcome[] = []
  const wasDirty = isDirty(session)
  let savepointCreated = false
  let modified = false
  let structureChanged = false

  const releaseUnneeded = (): void => {
    if (!modified && !wasDirty && savepointCreated) {
      releaseSavepoint(session)
      releaseUndoSavepoint(session)
      savepointCreated = false
    }
  }

  try {
    for (const st of iterStatements(text, from, to)) {
      const sql = st.text
      const type = statementType(sql)
      if (isTransactionControl(sql)) continue
      if (changesStructure(type)) structureChanged = true

      if (needsCommitFirst(sql, type)) {
        if (isDirty(session)) {
          if (!opts.commitConfirmed) {
            outcomes.push({
              kind: 'error',
              message: 'Execution aborted by user',
              start: st.start,
              end: st.end,
            })
            break
          }
          releaseAllSavepoints(session)
          savepointCreated = false
        }
      } else if (!savepointCreated && !session.readOnly && type !== 'ATTACH' && type !== 'DETACH') {
        setUndoSavepoint(session)
        setSavepoint(session)
        savepointCreated = true
      }

      logSql(session, sql, LogMessageType.User)
      const t0 = performance.now()
      let outcome: StatementOutcome
      try {
        const stmt = conn.prepare(sql)
        if (returnsRows(sql, type)) {
          // Validated by preparing; the result grid runs it page by page.
          const columns = stmt.reader ? stmt.columns().map((c) => c.name) : []
          outcome = {
            kind: 'rows',
            sql: sql.trim(),
            columns,
            ms: Math.round(performance.now() - t0),
            start: st.start,
            end: st.end,
          }
        } else if (stmt.reader) {
          // e.g. INSERT … RETURNING: runs once, its rows are shown as they are.
          const rows = stmt.raw(true).all() as SqlValue[][]
          const columns = stmt.columns().map((c) => c.name)
          modified = true
          outcome = {
            kind: 'static',
            message: doneMessage(t0, type, null),
            columns,
            rows,
            start: st.start,
            end: st.end,
          }
        } else {
          const info = stmt.run()
          if (type !== 'ATTACH' && type !== 'DETACH') modified = true
          outcome = {
            kind: 'executed',
            message: doneMessage(t0, type, info.changes),
            start: st.start,
            end: st.end,
          }
        }
      } catch (err) {
        releaseUnneeded()
        outcomes.push({ kind: 'error', message: (err as Error).message, start: st.start, end: st.end })
        break
      }
      outcomes.push(outcome)
      releaseUnneeded()
    }
  } finally {
    if (structureChanged) updateSchema(session)
  }
  return { outcomes, modified }
}

function doneMessage(t0: number, type: string, changes: number | null): string {
  const ms = Math.round(performance.now() - t0)
  const affected =
    changes !== null && (type === 'INSERT' || type === 'UPDATE' || type === 'DELETE')
      ? `, ${changes} rows affected`
      : ''
  return `query executed successfully. Took ${ms}ms${affected}`
}
