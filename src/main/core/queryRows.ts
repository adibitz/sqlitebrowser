// Port of reference/sqliteview/core/rowloader.py (_limit_query, build_count_query_for): pages through
// the result of an arbitrary statement from the SQL editor.
import { removeCommentsFromQuery } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'
import { logSql, runStatement } from './db/execute'
import type { DbSession } from './db/session'

const LIMIT_RE = /LIMIT\s+.+\s*((,|\b(OFFSET)\b)\s*.+\s*)?$/i
const COMPOUND_RE = /\s(UNION)|(INTERSECT)|(EXCEPT)\s/i
const NO_LIMIT_PREFIXES = ['PRAGMA', 'EXPLAIN', 'DELETE', 'INSERT', 'UPDATE']

function clean(sql: string): string {
  return removeCommentsFromQuery(sql.trim())
    .replace(/;+\s*$/, '')
    .trim()
}

/** Whether LIMIT/OFFSET can be appended; otherwise the statement is run whole and sliced. */
export function isPageable(sql: string): boolean {
  const q = clean(sql)
  const head = q.slice(0, 7).toUpperCase()
  if (NO_LIMIT_PREFIXES.some((p) => head.startsWith(p))) return false
  return !LIMIT_RE.test(q) && !COMPOUND_RE.test(q)
}

export function queryPage(session: DbSession, sql: string, offset: number, limit: number): SqlValue[][] {
  const q = clean(sql)
  if (isPageable(q)) {
    const paged = `${q} LIMIT ${limit} OFFSET ${offset};`
    logSql(session, paged)
    return runStatement(session, paged).rows ?? []
  }
  logSql(session, q)
  return (runStatement(session, q).rows ?? []).slice(offset, offset + limit)
}

export function queryCount(session: DbSession, sql: string): number {
  const q = clean(sql)
  if (isPageable(q)) {
    const count = `SELECT COUNT(*) FROM (${q});`
    logSql(session, count)
    return Number(runStatement(session, count).rows?.[0]?.[0] ?? 0)
  }
  return (runStatement(session, q).rows ?? []).length
}
