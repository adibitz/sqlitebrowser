// Port of reference/tests/test_core.py::test_alter_table_rename_drop_add, plus failure paths.
import { describe, expect, it } from 'vitest'
import { alterTable, renameTable } from '../../../../../src/main/core/db/alterTable'
import { querySingleValue } from '../../../../../src/main/core/db/execute'
import { getTableByName } from '../../../../../src/main/core/db/schemaLoad'
import { isDirty } from '../../../../../src/main/core/db/session'
import { Field } from '@shared/sqlb/field'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { openCoreTestDb } from '../../../../fixtures/coreTestDb'

const id = (name: string): ObjectIdentifier => new ObjectIdentifier('main', name)

describe('alterTable', () => {
  it('renames the table, renames and adds columns, then drops one by rebuilding', () => {
    const db = openCoreTestDb()
    const neu = getTableByName(db, id('parent'))!.clone()
    neu.name = 'people'
    neu.fields[1]!.name = 'full_name'
    neu.fields.push(Field.make('age', 'INTEGER', { defaultValue: '0' }))
    alterTable(db, id('parent'), neu, [
      ['id', 'id'],
      ['name', 'full_name'],
      [null, 'age'],
    ])
    const t = getTableByName(db, id('people'))!
    expect(t.fieldNames()).toEqual(['id', 'full_name', 'age'])
    expect(querySingleValue(db, 'SELECT full_name FROM people WHERE id=1')).toBe('alice')

    // Dropping a column goes through the rebuild path; the trigger on the table must survive.
    const neu2 = t.clone()
    neu2.removeField('age')
    neu2.fields[1]!.setNotNull(false)
    alterTable(db, id('people'), neu2, [['age', null]])
    expect(getTableByName(db, id('people'))!.fieldNames()).toEqual(['id', 'full_name'])
    expect(db.schemata.get('main')!.triggers.has('trg')).toBe(true)
    expect(querySingleValue(db, 'SELECT COUNT(*) FROM people')).toBe(3n)
  })

  it('keeps indices on renamed columns when rebuilding', () => {
    const db = openCoreTestDb()
    const neu = getTableByName(db, id('child'))!.clone()
    neu.fields[1]!.name = 'mother_id'
    neu.fields[0]!.setNotNull(false) // forces a rebuild in addition to the rename
    neu.renameKeyInAllConstraints('parent_id', 'mother_id')
    alterTable(db, id('child'), neu, [['parent_id', 'mother_id']])
    const idx = db.schemata.get('main')!.indices.get('idx_child_parent')!
    expect(idx.fields.map((c) => c.name)).toEqual(['mother_id'])
  })

  it('refuses a name that is already taken', () => {
    const db = openCoreTestDb()
    const neu = getTableByName(db, id('parent'))!.clone()
    neu.name = 'child'
    expect(() => alterTable(db, id('parent'), neu, [])).toThrow(/already exists/)
  })

  it('refuses unknown columns in the tracking list', () => {
    const db = openCoreTestDb()
    const neu = getTableByName(db, id('parent'))!.clone()
    expect(() => alterTable(db, id('parent'), neu, [['ghost', 'ghost']])).toThrow(/Cannot find column ghost/)
  })

  it('does nothing when the table is unchanged', () => {
    const db = openCoreTestDb()
    alterTable(db, id('parent'), getTableByName(db, id('parent'))!.clone(), [])
    expect(isDirty(db)).toBe(false)
  })

  it('renames a table when only the case changes', () => {
    const db = openCoreTestDb()
    renameTable(db, 'main', 'parent', 'Parent')
    expect(db.schemata.get('main')!.tables.has('Parent')).toBe(true)
  })
})
