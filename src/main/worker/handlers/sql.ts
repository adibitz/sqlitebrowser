import type { RunResult } from '@shared/ipc/sql'
import type { SqlValue } from '@shared/types/values'
import { queryCount, queryPage } from '../../core/queryRows'
import { runSqlScript } from '../../core/runSql'
import { session } from '../session'

export const sqlHandlers = {
  'sql.execute': (args: { text: string; from: number; to: number; commitConfirmed: boolean }): RunResult =>
    runSqlScript(session, args.text, args.from, args.to, { commitConfirmed: args.commitConfirmed }),

  'sql.count': (args: { sql: string }): number => queryCount(session, args.sql),

  'sql.page': (args: { sql: string; offset: number; limit: number }): SqlValue[][] =>
    queryPage(session, args.sql, args.offset, args.limit),
}
