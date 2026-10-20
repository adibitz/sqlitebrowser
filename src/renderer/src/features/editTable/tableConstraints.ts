// Port of the Constraints page of reference/sqliteview/ui/dialogs/edit_table.py.
import { parseForeignKeyClause } from '@shared/parser/createTable'
import { CheckConstraint, UniqueConstraint } from '@shared/sqlb/constraints'
import type { Table } from '@shared/sqlb/table'
import type { EditResult, TableDraft } from './tableDraft'

export type ConstraintKind = 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK'

export interface ConstraintRow {
  kind: ConstraintKind
  columns: string
  name: string
  sql: string
}

/** Table constraints in display order (keys, foreign keys, checks), like _populate_constraints. */
export function constraintRows(table: Table): ConstraintRow[] {
  return [
    ...table.indexConstraints.map(({ columns, constraint }) => ({
      kind: (constraint.isPrimaryKey() ? 'PRIMARY KEY' : 'UNIQUE') as ConstraintKind,
      columns: columns.map((c) => c.name).join(', '),
      name: constraint.name,
      sql: constraint.toSql(columns),
    })),
    ...table.foreignKeys.map(({ columns, clause }) => ({
      kind: 'FOREIGN KEY' as const,
      columns: columns.join(', '),
      name: clause.name,
      sql: clause.toSql(columns),
    })),
    ...table.checkConstraints.map((c) => ({
      kind: 'CHECK' as const,
      columns: '',
      name: c.name,
      sql: c.toSql(),
    })),
  ]
}

function withTable(d: TableDraft, fn: (t: Table) => void): TableDraft {
  const table = d.table.clone()
  fn(table)
  return { ...d, table }
}

export function removeConstraint(d: TableDraft, index: number): TableDraft {
  return withTable(d, (t) => {
    const objects = [
      ...t.indexConstraints.map((e) => e.constraint),
      ...t.foreignKeys.map((e) => e.clause),
      ...t.checkConstraints,
    ]
    const target = objects[index]
    if (target) t.removeConstraint(target)
  })
}

/** "a, b" → ['a', 'b'], or an error naming columns the table doesn't have (_pick_columns). */
export function parseColumnList(table: Table, text: string): { columns: string[]; error?: string } {
  const names = table.fieldNames()
  const columns = text
    .split(',')
    .map((c) => c.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
  const missing = columns.filter((c) => !names.includes(c))
  if (!columns.length || missing.length) {
    return { columns: [], error: `Unknown column(s): ${missing.join(', ') || '(none)'}` }
  }
  return { columns }
}

export function addUnique(d: TableDraft, columnsText: string): EditResult {
  const { columns, error } = parseColumnList(d.table, columnsText)
  if (error) return { draft: d, error }
  return { draft: withTable(d, (t) => t.addIndexConstraint(columns, new UniqueConstraint())) }
}

export function addCheck(d: TableDraft, expression: string): EditResult {
  const expr = expression.trim()
  if (!expr) return { draft: d, error: 'Enter an expression, e.g. price > 0.' }
  return { draft: withTable(d, (t) => t.checkConstraints.push(new CheckConstraint(expr))) }
}

export function addForeignKey(d: TableDraft, columnsText: string, references: string): EditResult {
  const { columns, error } = parseColumnList(d.table, columnsText)
  if (error) return { draft: d, error }
  const fk = parseForeignKeyClause(references)
  if (!fk) return { draft: d, error: "Couldn't read the foreign key reference." }
  return { draft: withTable(d, (t) => t.addForeignKey(columns, fk)) }
}
