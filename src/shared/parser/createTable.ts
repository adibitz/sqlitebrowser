// Port of reference/sqliteview/core/parser.py (parse_table: CREATE TABLE / CREATE VIRTUAL TABLE).
// Column-level PRIMARY KEY / REFERENCES are lifted into table constraints, like upstream's parser,
// so regenerated SQL matches. Unparseable statements give fullyParsed = false.
import {
  CheckConstraint,
  CollateConstraint,
  DefaultConstraint,
  ForeignKeyClause,
  GeneratedColumnConstraint,
  NotNullConstraint,
  PrimaryKeyConstraint,
  UniqueConstraint,
} from '../sqlb/constraints'
import { Field } from '../sqlb/field'
import { IndexedColumn } from '../sqlb/indexedColumn'
import { Table } from '../sqlb/table'
import { TokenCursor } from './cursor'
import { isKeyword, isOp, ParseError, type Token } from './tokenizer'

/** Keywords that start a column constraint (they end the type name). */
const COLUMN_CONSTRAINT_START = new Set([
  'CONSTRAINT',
  'PRIMARY',
  'NOT',
  'NULL',
  'UNIQUE',
  'CHECK',
  'DEFAULT',
  'COLLATE',
  'REFERENCES',
  'GENERATED',
  'AS',
])
const TABLE_CONSTRAINT_START = new Set(['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'CHECK', 'FOREIGN'])

export function parseTable(sql: string): Table {
  let table: Table
  try {
    table = new CreateTableParser(sql).parse()
  } catch (err) {
    if (!(err instanceof ParseError)) throw err
    table = new Table('')
    table.fullyParsed = false
  }
  table.originalSql = sql
  return table
}

/** Port of edit_table.parse_fk: the Foreign Key cell, `table(column) [ON DELETE …]`; null if invalid. */
export function parseForeignKeyClause(text: string): ForeignKeyClause | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return new CreateTableParser('REFERENCES ' + trimmed).foreignKeyOnly()
  } catch (err) {
    if (err instanceof ParseError) return null
    throw err
  }
}

class CreateTableParser extends TokenCursor {
  foreignKeyOnly(): ForeignKeyClause {
    const fk = this.foreignKeyClause()
    if (this.cur.kind !== 'eof') throw new ParseError(`Unexpected ${JSON.stringify(this.cur.text)}`)
    return fk
  }

  parse(): Table {
    this.expectKw('CREATE')
    this.acceptKw('TEMP', 'TEMPORARY')
    if (this.acceptKw('VIRTUAL')) {
      this.expectKw('TABLE')
      this.ifNotExists()
      const [, name] = this.qualifiedName()
      this.expectKw('USING')
      const t = new Table(name)
      t.virtualUsing = this.sql.slice(this.cur.start).trim().replace(/;+$/, '').trim()
      t.fullyParsed = true
      return t
    }
    this.expectKw('TABLE')
    this.ifNotExists()
    const [, name] = this.qualifiedName()
    const table = new Table(name)
    if (isKeyword(this.cur, 'AS'))
      throw new ParseError('CREATE TABLE ... AS SELECT is not structurally parsed')
    this.expectOp('(')
    for (;;) {
      const t = this.cur
      if (
        t.kind === 'id' &&
        TABLE_CONSTRAINT_START.has(t.value.toUpperCase()) &&
        !this.looksLikeColumnDef()
      ) {
        this.tableConstraint(table)
      } else {
        this.columnDef(table)
      }
      if (this.acceptOp(',')) continue
      this.expectOp(')')
      break
    }
    while (this.cur.kind !== 'eof') {
      if (this.acceptKw('WITHOUT')) {
        if (!isKeyword(this.cur, 'ROWID')) throw new ParseError('Expected ROWID')
        this.advance()
        table.withoutRowid = true
      } else if (this.acceptKw('STRICT')) {
        table.strict = true
      } else if (this.acceptOp(',') || this.acceptOp(';')) {
        continue
      } else {
        throw new ParseError(`Unexpected token ${JSON.stringify(this.cur.text)} after table definition`)
      }
    }
    table.fullyParsed = true
    return table
  }

  /**
   * An unquoted column called e.g. "check" is ambiguous; a table constraint keyword is followed by
   * "(" (CHECK/UNIQUE), KEY (PRIMARY/FOREIGN) or a name (CONSTRAINT).
   */
  private looksLikeColumnDef(): boolean {
    const t = this.cur
    const next = this.peek()
    const kw = t.value.toUpperCase()
    if (t.text !== t.value) return true // quoted identifier
    if (kw === 'CHECK' || kw === 'UNIQUE') return !isOp(next, '(')
    if (kw === 'PRIMARY' || kw === 'FOREIGN') return !isKeyword(next, 'KEY')
    return false
  }

  private columnDef(table: Table): void {
    const f = new Field(this.name(), '')
    let hasType = false
    const typeStart = this.cur.start
    let typeEnd = typeStart
    while (
      (this.cur.kind === 'id' || this.cur.kind === 'str') &&
      !(this.cur.kind === 'id' && COLUMN_CONSTRAINT_START.has(this.cur.value.toUpperCase()))
    ) {
      typeEnd = this.advance().end
      hasType = true
    }
    if (hasType && isOp(this.cur, '(')) {
      this.balancedText()
      typeEnd = this.prev().end
    }
    if (hasType) f.type = this.sql.slice(typeStart, typeEnd).trim().replace(/\s+/g, ' ')

    for (;;) {
      let cname = ''
      if (this.acceptKw('CONSTRAINT')) cname = this.name()
      const t = this.cur
      if (isKeyword(t, 'PRIMARY')) {
        this.advance()
        this.expectKw('KEY')
        const order = isKeyword(this.cur, 'ASC', 'DESC') ? this.advance().value.toUpperCase() : ''
        const pk = new PrimaryKeyConstraint('', cname)
        pk.conflictAction = this.conflictClause()
        if (this.acceptKw('AUTOINCREMENT')) pk.autoIncrement = true
        table.addIndexConstraint([new IndexedColumn(f.name, false, order)], pk)
      } else if (isKeyword(t, 'NOT')) {
        this.advance()
        this.expectKw('NULL')
        f.notNullConstraint = new NotNullConstraint(this.conflictClause(), cname)
      } else if (isKeyword(t, 'NULL')) {
        this.advance()
        this.conflictClause()
      } else if (isKeyword(t, 'UNIQUE')) {
        this.advance()
        f.uniqueConstraint = new UniqueConstraint(this.conflictClause(), cname)
      } else if (isKeyword(t, 'CHECK')) {
        this.advance()
        f.checkConstraint = new CheckConstraint(this.balancedText(), cname)
      } else if (isKeyword(t, 'DEFAULT')) {
        this.advance()
        f.defaultConstraint = new DefaultConstraint(this.defaultValue(), cname)
      } else if (isKeyword(t, 'COLLATE')) {
        this.advance()
        f.collateConstraint = new CollateConstraint(this.name(), cname)
      } else if (isKeyword(t, 'REFERENCES')) {
        const fk = this.foreignKeyClause()
        fk.name = cname
        table.addForeignKey([f.name], fk)
      } else if (isKeyword(t, 'GENERATED', 'AS')) {
        if (this.acceptKw('GENERATED')) this.expectKw('ALWAYS')
        this.expectKw('AS')
        const expr = this.balancedText()
        const storage = isKeyword(this.cur, 'STORED', 'VIRTUAL')
          ? this.advance().value.toUpperCase()
          : 'VIRTUAL'
        f.generated = new GeneratedColumnConstraint(expr, storage as 'STORED' | 'VIRTUAL', cname)
      } else {
        if (cname) throw new ParseError('Dangling CONSTRAINT name')
        break
      }
    }
    table.fields.push(f)
  }

  private defaultValue(): string {
    const t = this.cur
    if (isOp(t, '(')) return '(' + this.balancedText() + ')'
    if (isOp(t, '+') || isOp(t, '-')) {
      this.advance()
      return t.text + this.advance().text
    }
    this.advance()
    return t.text
  }

  private foreignKeyClause(): ForeignKeyClause {
    this.expectKw('REFERENCES')
    const fk = new ForeignKeyClause(this.name())
    if (isOp(this.cur, '(')) fk.columns = this.nameList()
    // A new column constraint can follow the FK clause.
    const stop = (t: Token): boolean =>
      isOp(t, ',') ||
      isKeyword(
        t,
        'CONSTRAINT',
        'PRIMARY',
        'UNIQUE',
        'CHECK',
        'DEFAULT',
        'COLLATE',
        'REFERENCES',
        'GENERATED',
        'AS',
      ) ||
      (isKeyword(t, 'NOT') && !isKeyword(this.peek(), 'DEFERRABLE')) ||
      isKeyword(t, 'NULL')
    fk.constraint = this.rawUntil(stop).replace(/\s+/g, ' ')
    return fk
  }

  private tableConstraint(table: Table): void {
    let cname = ''
    if (this.acceptKw('CONSTRAINT')) cname = this.name()
    if (this.acceptKw('PRIMARY')) {
      this.expectKw('KEY')
      const { columns, autoIncrement } = this.indexedColumnList(true)
      const pk = new PrimaryKeyConstraint('', cname, autoIncrement)
      pk.conflictAction = this.conflictClause()
      table.addIndexConstraint(columns, pk)
    } else if (this.acceptKw('UNIQUE')) {
      const { columns } = this.indexedColumnList()
      const uc = new UniqueConstraint('', cname)
      uc.conflictAction = this.conflictClause()
      table.addIndexConstraint(columns, uc)
    } else if (this.acceptKw('CHECK')) {
      table.checkConstraints.push(new CheckConstraint(this.balancedText(), cname))
    } else if (this.acceptKw('FOREIGN')) {
      this.expectKw('KEY')
      const columns = this.nameList()
      const fk = this.foreignKeyClause()
      fk.name = cname
      table.addForeignKey(columns, fk)
    } else {
      throw new ParseError(`Unknown table constraint ${JSON.stringify(this.cur.text)}`)
    }
  }
}
