// Port of reference/sqliteview/core/parser.py (tokenizer, Token, ParseError).

export type TokenKind = 'id' | 'str' | 'num' | 'blob' | 'op' | 'eof'

export interface Token {
  kind: TokenKind
  /** Raw text as written. */
  text: string
  /** Unquoted identifier / string content; equals `text` for everything else. */
  value: string
  start: number
  end: number
}

export class ParseError extends Error {
  override name = 'ParseError'
}

export function isKeyword(t: Token, ...words: string[]): boolean {
  return t.kind === 'id' && words.includes(t.value.toUpperCase())
}

export function isOp(t: Token, op: string): boolean {
  return t.kind === 'op' && t.text === op
}

const TOKEN_RE = new RegExp(
  [
    String.raw`(?<ws>\s+)`,
    String.raw`(?<lc>--[^\n]*)`,
    String.raw`(?<bc>/\*[\s\S]*?(?:\*/|$))`,
    String.raw`(?<blob>[xX]'(?:[^']|'')*')`,
    String.raw`(?<str>'(?:[^']|'')*')`,
    String.raw`(?<dq>"(?:[^"]|"")*")`,
    String.raw`(?<bt>` + '`(?:[^`]|``)*`)',
    String.raw`(?<br>\[[^\]]*\])`,
    String.raw`(?<num>(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+)`,
    String.raw`(?<id>[A-Za-z_\u0080-￿][A-Za-z0-9_$\u0080-￿]*)`,
    String.raw`(?<op>\|\||<<|>>|<=|>=|==|!=|<>|->>|->|[-+*/%&|~<>=(),;.])`,
  ].join('|'),
  'y',
)

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let pos = 0
  while (pos < sql.length) {
    TOKEN_RE.lastIndex = pos
    const m = TOKEN_RE.exec(sql)
    if (!m || !m.groups) throw new ParseError(`Unexpected character ${JSON.stringify(sql[pos])} at ${pos}`)
    const text = m[0]
    const start = pos
    const end = pos + text.length
    const g = m.groups
    const push = (kind: TokenKind, value: string): void => {
      tokens.push({ kind, text, value, start, end })
    }
    if (g.ws !== undefined || g.lc !== undefined || g.bc !== undefined) {
      // skipped
    } else if (g.dq !== undefined) push('id', text.slice(1, -1).replaceAll('""', '"'))
    else if (g.bt !== undefined) push('id', text.slice(1, -1).replaceAll('``', '`'))
    else if (g.br !== undefined) push('id', text.slice(1, -1))
    else if (g.id !== undefined) push('id', text)
    else if (g.str !== undefined) push('str', text.slice(1, -1).replaceAll("''", "'"))
    else if (g.blob !== undefined) push('blob', text)
    else if (g.num !== undefined) push('num', text)
    else push('op', text)
    pos = end
  }
  tokens.push({ kind: 'eof', text: '', value: '', start: sql.length, end: sql.length })
  return tokens
}
