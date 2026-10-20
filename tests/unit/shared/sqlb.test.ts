import { afterEach, describe, expect, it } from 'vitest'
import { Field } from '@shared/sqlb/field'
import {
  EscapeQuoting,
  escapeIdentifier,
  ObjectIdentifier,
  setIdentifierQuoting,
} from '@shared/sqlb/identifier'
import { Table } from '@shared/sqlb/table'

describe('identifier quoting', () => {
  afterEach(() => setIdentifierQuoting(EscapeQuoting.DoubleQuotes))

  it('doubles the quote character', () => {
    expect(escapeIdentifier('a"b')).toBe('"a""b"')
    setIdentifierQuoting(EscapeQuoting.GraveAccents)
    expect(escapeIdentifier('a`b')).toBe('`a``b`')
    setIdentifierQuoting(EscapeQuoting.SquareBrackets)
    expect(escapeIdentifier('a')).toBe('[a]')
  })
})

describe('ObjectIdentifier', () => {
  it('round-trips the project file format', () => {
    const id = new ObjectIdentifier('main', 'my:table')
    expect(id.toSerialised()).toBe('4,8:mainmy:table')
    expect(ObjectIdentifier.fromSerialised(id.toSerialised())).toEqual(id)
    expect(ObjectIdentifier.fromSerialised('3,1:ab')).toBeNull()
    expect(ObjectIdentifier.fromSerialised('nonsense')).toBeNull()
  })

  it('omits the main schema in short form', () => {
    expect(new ObjectIdentifier('main', 't').toString(true)).toBe('"t"')
    expect(new ObjectIdentifier('aux', 't').toString(true)).toBe('"aux"."t"')
    expect(new ObjectIdentifier('aux', 't').toDisplayString()).toBe('aux.t')
  })
})

describe('Table', () => {
  it('clones deeply and compares by structure', () => {
    const t = new Table('t')
    t.fields.push(Field.make('id', 'INTEGER', { notNull: true }))
    t.setPrimaryKeyColumns(['id'], true)
    const copy = t.clone()
    expect(copy.equals(t)).toBe(true)
    copy.fields[0]!.setNotNull(false)
    expect(copy.equals(t)).toBe(false)
    expect(t.fields[0]!.notNull).toBe(true)
  })

  it('tells type affinities apart', () => {
    expect(new Field('a', 'VARCHAR(10)').isText()).toBe(true)
    expect(new Field('a', 'bigint').isInteger()).toBe(true)
    expect(new Field('a', '').isBlob()).toBe(true)
    expect(new Field('a', 'DECIMAL(5,2)').isNumeric()).toBe(true)
  })

  it('renames and removes keys in every constraint', () => {
    const t = new Table('t')
    t.fields.push(new Field('a'), new Field('b'))
    t.setPrimaryKeyColumns(['a', 'b'])
    t.renameKeyInAllConstraints('a', 'x')
    expect(t.primaryKeyNames()).toEqual(['x', 'b'])
    t.removeKeyFromAllConstraints('x')
    expect(t.primaryKeyNames()).toEqual(['b'])
    t.setPrimaryKeyColumns([])
    expect(t.primaryKey()).toBeNull()
  })
})
