import { z } from 'zod'
import type { SqlValue } from '../types/values'
import { MAX_PAGE_ROWS } from './rows'

export const sqlChannels = {
  execute: 'sql:execute',
  count: 'sql:count',
  page: 'sql:page',
} as const

const MAX_SCRIPT = 64 * 1024 * 1024
const sqlText = z.string().min(1).max(MAX_SCRIPT)

export const sqlSchemas = {
  execute: z.object({
    text: z.string().max(MAX_SCRIPT),
    from: z.number().int().min(0),
    to: z.number().int().min(0),
    commitConfirmed: z.boolean(),
  }),
  count: z.object({ sql: sqlText }),
  page: z.object({
    sql: sqlText,
    offset: z.number().int().min(0),
    limit: z.number().int().min(1).max(MAX_PAGE_ROWS),
  }),
}

/** What happened to one statement of a run (positions are offsets into the editor text). */
export type StatementOutcome =
  | { kind: 'executed'; message: string; start: number; end: number }
  | { kind: 'error'; message: string; start: number; end: number }
  | { kind: 'rows'; sql: string; columns: string[]; ms: number; start: number; end: number }
  | { kind: 'static'; message: string; columns: string[]; rows: SqlValue[][]; start: number; end: number }

export interface RunResult {
  outcomes: StatementOutcome[]
  /** Data or schema was written; open grids reload. */
  modified: boolean
}

export interface SqlApi {
  /** Runs the statements between `from` and `to` of `text` (port of RunSql). */
  execute(req: z.infer<typeof sqlSchemas.execute>): Promise<RunResult>
  /** Rows of a row-returning statement from a run. */
  count(req: z.infer<typeof sqlSchemas.count>): Promise<number>
  page(req: z.infer<typeof sqlSchemas.page>): Promise<SqlValue[][]>
}
