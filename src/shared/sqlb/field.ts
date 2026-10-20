// Port of reference/sqliteview/core/sqlb.py (Field, Affinity).
import {
  CheckConstraint,
  CollateConstraint,
  DefaultConstraint,
  GeneratedColumnConstraint,
  NotNullConstraint,
  UniqueConstraint,
} from './constraints'
import { escapeIdentifier } from './identifier'

const TEXT_PREFIXES = ['character', 'varchar', 'varying character', 'nchar', 'native character', 'nvarchar']
const INTEGER_TYPES = new Set([
  'int',
  'integer',
  'tinyint',
  'smallint',
  'mediumint',
  'bigint',
  'unsigned big int',
  'int2',
  'int8',
])
const REAL_TYPES = new Set(['real', 'double', 'double precision', 'float'])
const NUMERIC_TYPES = new Set(['numeric', 'boolean', 'date', 'datetime'])

export enum Affinity {
  Integer = 1,
  Float = 2,
  Text = 3,
  Blob = 4,
}

export interface FieldOptions {
  notNull?: boolean
  defaultValue?: string
  check?: string
  unique?: boolean
  collation?: string
}

export class Field {
  notNullConstraint: NotNullConstraint | null = null
  checkConstraint: CheckConstraint | null = null
  defaultConstraint: DefaultConstraint | null = null
  uniqueConstraint: UniqueConstraint | null = null
  collateConstraint: CollateConstraint | null = null
  generated: GeneratedColumnConstraint | null = null

  constructor(
    public name = '',
    public type = '',
  ) {}

  static make(name: string, type: string, opts: FieldOptions = {}): Field {
    const f = new Field(name, type)
    f.setNotNull(opts.notNull ?? false)
    f.setDefault(opts.defaultValue ?? '')
    f.setCheck(opts.check ?? '')
    f.setUnique(opts.unique ?? false)
    f.setCollation(opts.collation ?? '')
    return f
  }

  get notNull(): boolean {
    return this.notNullConstraint !== null
  }
  get check(): string {
    return this.checkConstraint?.expression ?? ''
  }
  get defaultValue(): string {
    return this.defaultConstraint?.value ?? ''
  }
  get unique(): boolean {
    return this.uniqueConstraint !== null
  }
  get collation(): string {
    return this.collateConstraint?.collation ?? ''
  }

  setNotNull(v = true): void {
    this.notNullConstraint = v ? new NotNullConstraint() : null
  }
  setCheck(expr: string): void {
    this.checkConstraint = expr ? new CheckConstraint(expr) : null
  }
  setDefault(value: string): void {
    this.defaultConstraint = value ? new DefaultConstraint(value) : null
  }
  setUnique(v: boolean): void {
    this.uniqueConstraint = v ? new UniqueConstraint() : null
  }
  setCollation(c: string): void {
    this.collateConstraint = c ? new CollateConstraint(c) : null
  }

  toString(indent = '\t', sep = '\t'): string {
    let s = indent + escapeIdentifier(this.name) + sep + this.type
    if (this.notNullConstraint) s += ' ' + this.notNullConstraint.toSql()
    if (this.defaultConstraint) s += ' ' + this.defaultConstraint.toSql()
    if (this.checkConstraint) s += ' ' + this.checkConstraint.toSql()
    if (this.uniqueConstraint) s += ' ' + this.uniqueConstraint.toSql([])
    if (this.collateConstraint) s += ' ' + this.collateConstraint.toSql()
    if (this.generated) s += ' ' + this.generated.toSql()
    return s
  }

  // Type helpers (same rules as upstream).
  isText(): boolean {
    const t = this.type.toLowerCase()
    return TEXT_PREFIXES.some((p) => t.startsWith(p)) || t === 'text' || t === 'clob'
  }
  isInteger(): boolean {
    return INTEGER_TYPES.has(this.type.toLowerCase())
  }
  isReal(): boolean {
    return REAL_TYPES.has(this.type.toLowerCase())
  }
  isNumeric(): boolean {
    const t = this.type.toLowerCase()
    return t.startsWith('decimal') || NUMERIC_TYPES.has(t)
  }
  isBlob(): boolean {
    return !this.type || this.type.toLowerCase() === 'blob'
  }

  affinity(): Affinity {
    if (this.isInteger()) return Affinity.Integer
    if (this.isText()) return Affinity.Text
    if (this.isBlob()) return Affinity.Blob
    if (this.isReal() || this.isNumeric()) return Affinity.Float
    return Affinity.Blob
  }

  clone(): Field {
    const f = new Field(this.name, this.type)
    f.notNullConstraint =
      this.notNullConstraint && Object.assign(new NotNullConstraint(), this.notNullConstraint)
    f.checkConstraint = this.checkConstraint && Object.assign(new CheckConstraint(), this.checkConstraint)
    f.defaultConstraint =
      this.defaultConstraint && Object.assign(new DefaultConstraint(), this.defaultConstraint)
    f.uniqueConstraint = this.uniqueConstraint && this.uniqueConstraint.clone()
    f.collateConstraint =
      this.collateConstraint && Object.assign(new CollateConstraint(), this.collateConstraint)
    f.generated = this.generated && Object.assign(new GeneratedColumnConstraint(), this.generated)
    return f
  }
}
