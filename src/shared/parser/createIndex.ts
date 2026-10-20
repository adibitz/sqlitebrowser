// Port of reference/sqliteview/core/parser.py (parse_index).
import { Index } from '../sqlb/indexDef'
import { TokenCursor } from './cursor'
import { ParseError } from './tokenizer'

export function parseIndex(sql: string): Index {
  let index: Index
  try {
    index = new CreateIndexParser(sql).parse()
  } catch (err) {
    if (!(err instanceof ParseError)) throw err
    index = new Index('')
    index.fullyParsed = false
  }
  index.originalSql = sql
  return index
}

class CreateIndexParser extends TokenCursor {
  parse(): Index {
    this.expectKw('CREATE')
    const idx = new Index()
    if (this.acceptKw('UNIQUE')) idx.unique = true
    this.expectKw('INDEX')
    this.ifNotExists()
    idx.name = this.qualifiedName()[1]
    this.expectKw('ON')
    idx.table = this.name()
    idx.fields = this.indexedColumnList().columns
    if (this.acceptKw('WHERE')) {
      idx.whereExpr = this.sql.slice(this.cur.start).trim().replace(/;+$/, '').trim()
    } else {
      this.acceptOp(';')
      if (this.cur.kind !== 'eof') throw new ParseError('Unexpected trailing tokens')
    }
    idx.fullyParsed = true
    return idx
  }
}
