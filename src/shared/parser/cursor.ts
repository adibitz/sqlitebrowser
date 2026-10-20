// Port of reference/sqliteview/core/parser.py (_Parser primitives shared by the CREATE parsers).
import { escapeIdentifier } from '../sqlb/identifier'
import { IndexedColumn } from '../sqlb/indexedColumn'
import { isKeyword, isOp, ParseError, tokenize, type Token } from './tokenizer'

const CONFLICT_ACTIONS = new Set(['ROLLBACK', 'ABORT', 'FAIL', 'IGNORE', 'REPLACE'])

export class TokenCursor {
  readonly toks: Token[]
  i = 0

  constructor(readonly sql: string) {
    this.toks = tokenize(sql)
  }

  get cur(): Token {
    return this.toks[this.i]!
  }

  peek(k = 1): Token {
    return this.toks[Math.min(this.i + k, this.toks.length - 1)]!
  }

  /** The token just consumed. */
  prev(): Token {
    return this.toks[this.i - 1]!
  }

  advance(): Token {
    const t = this.cur
    if (t.kind !== 'eof') this.i++
    return t
  }

  acceptKw(...words: string[]): boolean {
    if (!isKeyword(this.cur, ...words)) return false
    this.advance()
    return true
  }

  expectKw(...words: string[]): Token {
    if (!isKeyword(this.cur, ...words)) {
      throw new ParseError(`Expected ${words.join('/')} but got ${JSON.stringify(this.cur.text)}`)
    }
    return this.advance()
  }

  acceptOp(op: string): boolean {
    if (!isOp(this.cur, op)) return false
    this.advance()
    return true
  }

  expectOp(op: string): Token {
    if (!isOp(this.cur, op)) throw new ParseError(`Expected '${op}' but got ${JSON.stringify(this.cur.text)}`)
    return this.advance()
  }

  name(): string {
    const t = this.cur
    if (t.kind === 'id' || t.kind === 'str') {
      this.advance()
      return t.value
    }
    throw new ParseError(`Expected a name but got ${JSON.stringify(t.text)}`)
  }

  /** [schema, name]; schema is '' when not given. */
  qualifiedName(): [string, string] {
    const first = this.name()
    if (this.acceptOp('.')) return [first, this.name()]
    return ['', first]
  }

  ifNotExists(): void {
    if (!isKeyword(this.cur, 'IF')) return
    this.advance()
    this.expectKw('NOT')
    this.expectKw('EXISTS')
  }

  /** Consumes '( ... )' and returns the raw text between the parentheses. */
  balancedText(): string {
    const open = this.expectOp('(')
    let depth = 1
    while (depth) {
      const t = this.advance()
      if (t.kind === 'eof') throw new ParseError('Unbalanced parentheses')
      if (isOp(t, '(')) depth++
      else if (isOp(t, ')')) depth--
    }
    return this.sql.slice(open.end, this.prev().start).trim()
  }

  /** Consumes tokens until `stop(token)` holds at paren depth 0; returns the raw text. */
  rawUntil(stop: (t: Token) => boolean): string {
    const start = this.cur.start
    let end = start
    let depth = 0
    while (this.cur.kind !== 'eof') {
      const t = this.cur
      if (depth === 0 && stop(t)) break
      if (isOp(t, '(')) depth++
      else if (isOp(t, ')')) {
        if (depth === 0) break
        depth--
      }
      end = t.end
      this.advance()
    }
    return this.sql.slice(start, end).trim()
  }

  conflictClause(): string {
    if (!(isKeyword(this.cur, 'ON') && isKeyword(this.peek(), 'CONFLICT'))) return ''
    this.advance()
    this.advance()
    const action = this.advance().value.toUpperCase()
    if (!CONFLICT_ACTIONS.has(action)) throw new ParseError('Invalid conflict action')
    return action
  }

  /** '(' col [COLLATE x] [ASC|DESC] [AUTOINCREMENT], … ')' */
  indexedColumnList(allowAutoincrement = false): { columns: IndexedColumn[]; autoIncrement: boolean } {
    this.expectOp('(')
    const columns: IndexedColumn[] = []
    let autoIncrement = false
    for (;;) {
      const startI = this.i
      const expr = this.rawUntil(
        (t) => isOp(t, ',') || isKeyword(t, 'ASC', 'DESC', 'COLLATE', 'AUTOINCREMENT'),
      )
      const span = this.toks.slice(startI, this.i)
      let col =
        span.length === 1 && (span[0]!.kind === 'id' || span[0]!.kind === 'str')
          ? new IndexedColumn(span[0]!.value, false)
          : new IndexedColumn(expr, true)
      if (this.acceptKw('COLLATE')) {
        const collation = this.name()
        if (!col.isExpression)
          col = new IndexedColumn(`${escapeIdentifier(col.name)} COLLATE ${collation}`, true)
        else col.name += ' COLLATE ' + collation
      }
      if (isKeyword(this.cur, 'ASC', 'DESC')) col.order = this.advance().value.toUpperCase()
      if (allowAutoincrement && this.acceptKw('AUTOINCREMENT')) autoIncrement = true
      columns.push(col)
      if (this.acceptOp(',')) continue
      this.expectOp(')')
      return { columns, autoIncrement }
    }
  }

  nameList(): string[] {
    this.expectOp('(')
    const names = [this.name()]
    while (this.acceptOp(',')) names.push(this.name())
    this.expectOp(')')
    return names
  }
}
