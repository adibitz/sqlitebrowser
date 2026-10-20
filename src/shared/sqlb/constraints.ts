// Port of reference/sqliteview/core/sqlb.py (constraint classes).
import { escapeIdentifier, escapeIdentifiers } from './identifier'
import { joinIndexedColumns, type IndexedColumn } from './indexedColumn'

function constraintPrefix(name: string): string {
  return name ? `CONSTRAINT ${escapeIdentifier(name)} ` : ''
}

export class ForeignKeyClause {
  readonly kind = 'foreignKey'
  constructor(
    public table = '',
    public columns: string[] = [],
    /** e.g. "ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED" */
    public constraint = '',
    public name = '',
  ) {}

  toString(): string {
    let result = escapeIdentifier(this.table)
    if (this.columns.length) result += '(' + escapeIdentifiers(this.columns).join(',') + ')'
    if (this.constraint) result += ' ' + this.constraint
    return result
  }

  toSql(columns: readonly string[]): string {
    return (
      constraintPrefix(this.name) +
      'FOREIGN KEY(' +
      escapeIdentifiers(columns).join(',') +
      ') REFERENCES ' +
      this.toString()
    )
  }

  clone(): ForeignKeyClause {
    return new ForeignKeyClause(this.table, [...this.columns], this.constraint, this.name)
  }
}

export class UniqueConstraint {
  readonly kind: 'unique' | 'primaryKey' = 'unique'
  constructor(
    public conflictAction = '',
    public name = '',
  ) {}

  isPrimaryKey(): this is PrimaryKeyConstraint {
    return false
  }

  toSql(columns: readonly IndexedColumn[]): string {
    let result = constraintPrefix(this.name) + 'UNIQUE'
    if (columns.length) result += '(' + joinIndexedColumns(columns, ',') + ')'
    if (this.conflictAction) result += ' ON CONFLICT ' + this.conflictAction
    return result
  }

  clone(): UniqueConstraint {
    return new UniqueConstraint(this.conflictAction, this.name)
  }
}

export class PrimaryKeyConstraint extends UniqueConstraint {
  override readonly kind = 'primaryKey'
  constructor(
    conflictAction = '',
    name = '',
    public autoIncrement = false,
  ) {
    super(conflictAction, name)
  }

  override isPrimaryKey(): this is PrimaryKeyConstraint {
    return true
  }

  override toSql(columns: readonly IndexedColumn[]): string {
    let result =
      constraintPrefix(this.name) +
      'PRIMARY KEY(' +
      joinIndexedColumns(columns, ',') +
      (this.autoIncrement ? ' AUTOINCREMENT' : '') +
      ')'
    if (this.conflictAction) result += ' ON CONFLICT ' + this.conflictAction
    return result
  }

  override clone(): PrimaryKeyConstraint {
    return new PrimaryKeyConstraint(this.conflictAction, this.name, this.autoIncrement)
  }
}

export class NotNullConstraint {
  constructor(
    public conflictAction = '',
    public name = '',
  ) {}

  toSql(): string {
    let result = constraintPrefix(this.name) + 'NOT NULL'
    if (this.conflictAction) result += ' ON CONFLICT ' + this.conflictAction
    return result
  }
}

export class CheckConstraint {
  readonly kind = 'check'
  constructor(
    public expression = '',
    public name = '',
  ) {}

  toSql(): string {
    return constraintPrefix(this.name) + 'CHECK(' + this.expression + ')'
  }
}

export class DefaultConstraint {
  constructor(
    public value = '',
    public name = '',
  ) {}

  toSql(): string {
    return constraintPrefix(this.name) + 'DEFAULT ' + this.value
  }
}

export class CollateConstraint {
  constructor(
    public collation = '',
    public name = '',
  ) {}

  toSql(): string {
    return constraintPrefix(this.name) + 'COLLATE ' + this.collation
  }
}

export type GeneratedStorage = 'VIRTUAL' | 'STORED'

export class GeneratedColumnConstraint {
  constructor(
    public expression = '',
    public storage: GeneratedStorage = 'VIRTUAL',
    public name = '',
  ) {}

  toSql(): string {
    return constraintPrefix(this.name) + `GENERATED ALWAYS AS (${this.expression}) ${this.storage}`
  }
}
