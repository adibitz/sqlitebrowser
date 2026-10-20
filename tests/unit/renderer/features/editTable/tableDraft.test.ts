// The edits of the table dialog (port of EditTableDialog), checked through the SQL they produce.
import { describe, expect, it } from 'vitest'
import {
  addColumn,
  canAutoIncrement,
  columnForeignKey,
  draftFromSql,
  emptyDraft,
  moveColumn,
  previewSql,
  removeColumn,
  renameColumn,
  setAutoIncrement,
  setColumnForeignKey,
  setTableName,
  togglePrimaryKey,
  updateColumn,
} from '@/features/editTable/tableDraft'
import {
  addCheck,
  addForeignKey,
  addUnique,
  constraintRows,
  removeConstraint,
} from '@/features/editTable/tableConstraints'
import { validateTable } from '@/features/editTable/validateTable'
import { SCHEMA } from '../../fixtures'

const PEOPLE = 'CREATE TABLE "people" ("id" INTEGER, "name" TEXT, PRIMARY KEY("id" AUTOINCREMENT));'

describe('table draft', () => {
  it('builds a new table column by column', () => {
    let d = setTableName(emptyDraft(), '  notes ')
    d = addColumn(addColumn(d))
    d = renameColumn(d, 1, 'body').draft
    d = updateColumn(d, 1, { type: 'TEXT', notNull: true, defaultValue: "''" })
    d = togglePrimaryKey(d, 0)
    d = setAutoIncrement(d, 0, true)
    expect(previewSql(d)).toBe(
      'CREATE TABLE "notes" (\n\t"Field1"\tINTEGER,\n\t"body"\tTEXT NOT NULL DEFAULT \'\',\n\tPRIMARY KEY("Field1" AUTOINCREMENT)\n);',
    )
    expect(d.track).toEqual([
      [null, 'Field1'],
      [null, 'body'],
    ])
  })

  it('tracks renames and drops of existing columns, and keeps keys in step', () => {
    let d = draftFromSql(PEOPLE, 'main')
    d = renameColumn(d, 0, 'person_id').draft
    expect(d.table.primaryKeyNames()).toEqual(['person_id'])
    d = removeColumn(d, 1)
    expect(d.track).toEqual([
      ['id', 'person_id'],
      ['name', null],
    ])
    expect(d.table.fieldNames()).toEqual(['person_id'])
  })

  it('refuses a duplicate column name and leaves the draft as it was', () => {
    const d = draftFromSql(PEOPLE, 'main')
    const result = renameColumn(d, 1, 'ID')
    expect(result.error).toBe("There already is a column named 'ID'.")
    expect(result.draft).toBe(d)
  })

  it('drops AUTOINCREMENT once the key is no longer a single INTEGER column', () => {
    let d = draftFromSql(PEOPLE, 'main')
    expect(canAutoIncrement(d.table, 'id')).toBe(true)
    d = togglePrimaryKey(d, 1)
    expect(d.table.primaryKeyNames()).toEqual(['id', 'name'])
    expect(d.table.primaryKey()?.autoIncrement).toBe(false)
    d = togglePrimaryKey(d, 1)
    d = updateColumn(d, 0, { type: 'TEXT' })
    expect(canAutoIncrement(d.table, 'id')).toBe(false)
  })

  it('moves columns without touching the track', () => {
    const d = moveColumn(draftFromSql(PEOPLE, 'main'), 0, 1)
    expect(d.table.fieldNames()).toEqual(['name', 'id'])
    expect(moveColumn(d, 1, 1)).toBe(d)
  })

  it('reads and writes the Foreign Key cell', () => {
    let d = draftFromSql(PEOPLE, 'main')
    d = setColumnForeignKey(d, 1, 'names(value) ON DELETE CASCADE').draft
    expect(columnForeignKey(d.table, 'name')).toBe('"names"("value") ON DELETE CASCADE')
    expect(setColumnForeignKey(d, 1, 'names(value').error).toMatch(/must look like/)
    d = setColumnForeignKey(d, 1, '').draft
    expect(columnForeignKey(d.table, 'name')).toBe('')
  })
})

describe('table constraints', () => {
  it('adds and removes table constraints', () => {
    let d = draftFromSql(PEOPLE, 'main')
    d = addUnique(d, 'name, "id"').draft
    d = addCheck(d, 'length(name) > 0').draft
    d = addForeignKey(d, 'id', 'other(x)').draft
    expect(constraintRows(d.table).map((r) => r.kind)).toEqual([
      'PRIMARY KEY',
      'UNIQUE',
      'FOREIGN KEY',
      'CHECK',
    ])
    expect(constraintRows(d.table)[1]!.sql).toBe('UNIQUE("name","id")')
    d = removeConstraint(d, 1)
    expect(constraintRows(d.table).map((r) => r.kind)).toEqual(['PRIMARY KEY', 'FOREIGN KEY', 'CHECK'])
    expect(addUnique(d, 'nope').error).toBe('Unknown column(s): nope')
    expect(addCheck(d, ' ').error).toMatch(/expression/)
    expect(addForeignKey(d, 'id', 'other(').error).toMatch(/reference/)
  })
})

describe('validateTable', () => {
  it('explains what blocks saving', () => {
    expect(validateTable(emptyDraft(), null, SCHEMA)).toMatch(/name for the table/)
    const d = draftFromSql('CREATE TABLE orders (id INTEGER, x)', 'main')
    expect(validateTable(d, null, SCHEMA)).toBe("A table named 'orders' already exists.")
    expect(validateTable(d, { schema: 'main', name: 'orders' }, SCHEMA)).toBe('')
    const noKey = draftFromSql('CREATE TABLE t (a) WITHOUT ROWID', 'main')
    expect(validateTable(noKey, null, SCHEMA)).toMatch(/need a primary key/)
    expect(validateTable(setTableName(emptyDraft(), 'fresh'), null, SCHEMA)).toMatch(/at least one column/)
  })
})
