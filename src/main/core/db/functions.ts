// Port of reference/sqliteview/core/db.py (_sql_regexp, _sql_make_single_value, _setup_connection).
import type Database from 'better-sqlite3'
import { valueToText } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'

const REGEX_CACHE_SIZE = 50
const regexCache = new Map<string, RegExp>()

function compileRegex(pattern: string): RegExp {
  let rx = regexCache.get(pattern)
  if (!rx) {
    try {
      rx = new RegExp(pattern)
    } catch {
      throw new Error('invalid operand')
    }
    if (regexCache.size >= REGEX_CACHE_SIZE) regexCache.delete(regexCache.keys().next().value!)
    regexCache.set(pattern, rx)
  }
  return rx
}

/** `value REGEXP pattern`: 1 when the pattern matches anywhere in the value (an INTEGER, like Python). */
export function sqlRegexp(pattern: SqlValue, value: SqlValue): bigint | null {
  if (pattern === null || value === null) return null
  return compileRegex(valueToText(pattern)).test(valueToText(value)) ? 1n : 0n
}

/** Joins composite keys into one comparable value: "<utf8 length>:<text>" per argument. */
export function sqlMakeSingleValue(...args: SqlValue[]): string {
  const encoder = new TextEncoder()
  return args
    .map((a) => {
      const t = a === null ? '' : valueToText(a)
      return `${encoder.encode(t).length}:${t}`
    })
    .join('')
}

export function registerFunctions(conn: Database.Database, disableRegex: boolean): void {
  if (!disableRegex) {
    conn.function('REGEXP', { deterministic: true, safeIntegers: true }, (p: unknown, v: unknown) =>
      sqlRegexp(p as SqlValue, v as SqlValue),
    )
  }
  conn.function(
    'sqlb_make_single_value',
    { deterministic: true, varargs: true, safeIntegers: true },
    (...args: unknown[]) => sqlMakeSingleValue(...(args as SqlValue[])),
  )
}
