// Port of reference/sqliteview/core/sqlsplit.py.
// The Python version found statement ends with sqlite3.complete_statement(); better-sqlite3 doesn't
// expose sqlite3_complete(), so its state machine (SQLite's complete.c, public domain) is ported here
// and run once over the script. It understands strings, comments and CREATE TRIGGER … BEGIN … END.

export interface Statement {
  /** Offset of the first character (after leading whitespace and comments). */
  start: number
  /** Offset just past the terminating ';' (or the end of the text). */
  end: number
  text: string
}

enum Tk {
  Semi = 0,
  Ws = 1,
  Other = 2,
  Explain = 3,
  Create = 4,
  Temp = 5,
  Trigger = 6,
  End = 7,
}

/** complete.c trans[state][token]. State 1 (START) after a ';' means a statement just ended. */
const TRANS: readonly (readonly number[])[] = [
  /* 0 INVALID */ [1, 0, 2, 3, 4, 2, 2, 2],
  /* 1   START */ [1, 1, 2, 3, 4, 2, 2, 2],
  /* 2  NORMAL */ [1, 2, 2, 2, 2, 2, 2, 2],
  /* 3 EXPLAIN */ [1, 3, 3, 2, 4, 2, 2, 2],
  /* 4  CREATE */ [1, 4, 2, 2, 2, 4, 5, 2],
  /* 5 TRIGGER */ [6, 5, 5, 5, 5, 5, 5, 5],
  /* 6    SEMI */ [6, 6, 5, 5, 5, 5, 5, 7],
  /* 7     END */ [1, 7, 5, 5, 5, 5, 5, 5],
]

const LEADING_RE = /(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?(?:\*\/|$))*/y
const ONLY_COMMENTS_RE = /^(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?(?:\*\/|$)|;)*$/

function isIdChar(c: string | undefined): boolean {
  return c !== undefined && (/[A-Za-z0-9_$]/.test(c) || c.charCodeAt(0) >= 0x80)
}

function keywordToken(word: string): Tk {
  switch (word.toLowerCase()) {
    case 'create':
      return Tk.Create
    case 'trigger':
      return Tk.Trigger
    case 'temp':
    case 'temporary':
      return Tk.Temp
    case 'end':
      return Tk.End
    case 'explain':
      return Tk.Explain
    default:
      return Tk.Other
  }
}

/**
 * Offset just past the ';' that completes the statement starting at `pos`, or -1 when the text up to
 * `end` never completes (unterminated string/comment, or no final ';').
 */
function findStatementEnd(sql: string, pos: number, end: number): number {
  let state = 0
  let i = pos
  while (i < end) {
    const c = sql[i]!
    let token: Tk
    if (c === ';') {
      token = Tk.Semi
      i++
    } else if (/\s/.test(c)) {
      token = Tk.Ws
      i++
    } else if (c === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2)
      if (close < 0 || close + 2 > end) return -1
      token = Tk.Ws
      i = close + 2
    } else if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i)
      if (nl < 0 || nl >= end) return -1
      token = Tk.Ws
      i = nl + 1
    } else if (c === '[' || c === '`' || c === '"' || c === "'") {
      const close = sql.indexOf(c === '[' ? ']' : c, i + 1)
      if (close < 0 || close >= end) return -1
      token = Tk.Other
      i = close + 1
    } else if (isIdChar(c)) {
      let j = i + 1
      while (j < end && isIdChar(sql[j])) j++
      token = /[A-Za-z]/.test(c) ? keywordToken(sql.slice(i, j)) : Tk.Other
      i = j
    } else {
      token = Tk.Other
      i++
    }
    state = TRANS[state]![token]!
    if (token === Tk.Semi && state === 1) return i
  }
  return -1
}

/** True if `sql` only contains whitespace, comments and semicolons. */
export function isBlank(sql: string): boolean {
  return ONLY_COMMENTS_RE.test(sql)
}

export function* iterStatements(sql: string, start = 0, end = sql.length): Generator<Statement> {
  let pos = start
  while (pos < end) {
    LEADING_RE.lastIndex = pos
    const lead = LEADING_RE.exec(sql.slice(0, end))
    pos = lead ? pos + lead[0].length : pos
    if (pos >= end) return
    const found = findStatementEnd(sql, pos, end)
    const stmtEnd = found < 0 ? end : found
    const text = sql.slice(pos, stmtEnd)
    if (!isBlank(text)) yield { start: pos, end: stmtEnd, text }
    pos = stmtEnd
  }
}

export function splitStatements(sql: string): string[] {
  return [...iterStatements(sql)].map((s) => s.text)
}

/** Statement containing the character offset `cursor` (used by "Execute current"). */
export function statementAt(sql: string, cursor: number): Statement | null {
  let last: Statement | null = null
  for (const st of iterStatements(sql)) {
    if (st.start <= cursor && cursor <= st.end) return st
    if (st.start > cursor) return last ?? st
    last = st
  }
  return last
}
