// Create/alter/drop as the schema dialogs do it, the foreign-key rules of MainWindow.edit_table,
// the Database Info pragmas, and inserting a record with values (AddRecordDialog).
import { describe, expect, it } from 'vitest'
import { executeSql, querySingleValue } from '../../../../src/main/core/db/execute'
import { getIndexByName, getTableByName } from '../../../../src/main/core/db/schemaLoad'
import { isDirty } from '../../../../src/main/core/db/session'
import { insertRecord } from '../../../../src/main/core/rows'
import {
  createIndex,
  databaseInfo,
  dropObject,
  saveTable,
  setPragmas,
  tableDefinition,
} from '../../../../src/main/core/schemaEdit'
import { parseTable } from '@shared/parser/createTable'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'

const main = (name: string): ObjectIdentifier => new ObjectIdentifier('main', name)
const parent = { schema: 'main', name: 'parent' }

describe('saveTable', () => {
  it('creates a table from its CREATE statement, with an undo point', () => {
    const db = openCoreTestDb()
    const result = saveTable(db, {
      original: null,
      schema: 'main',
      sql: 'CREATE TABLE "notes" ("id" INTEGER PRIMARY KEY, "body" TEXT NOT NULL);',
      track: [],
      commitConfirmed: false,
    })
    expect(result).toEqual({ kind: 'done', ref: { schema: 'main', name: 'notes' } })
    expect(getTableByName(db, main('notes'))!.fieldNames()).toEqual(['id', 'body'])
    expect(isDirty(db)).toBe(true)
  })

  it('round-trips the definition the dialog edits, renaming and adding columns', () => {
    const db = openCoreTestDb()
    const def = tableDefinition(db, parent)
    expect(def.fullyParsed).toBe(true)
    const table = parseTable(def.sql)
    table.fields[1]!.name = 'full_name'
    table.renameKeyInAllConstraints('name', 'full_name')
    saveTable(db, {
      original: parent,
      schema: 'main',
      sql: table.sql('main'),
      track: [['name', 'full_name']],
      commitConfirmed: false,
    })
    expect(querySingleValue(db, 'SELECT full_name FROM parent WHERE id = 2')).toBe('bob')
    expect(getTableByName(db, main('parent'))!.primaryKey()?.autoIncrement).toBe(true)
  })

  it('reverts to the undo point when the change fails', () => {
    const db = openCoreTestDb()
    const req = {
      original: null,
      schema: 'main',
      sql: 'CREATE TABLE parent (x);',
      track: [],
      commitConfirmed: false,
    }
    expect(() => saveTable(db, req)).toThrow(/already exists/)
    expect(isDirty(db)).toBe(false)
  })

  it('rejects statements that are not a CREATE TABLE', () => {
    const db = openCoreTestDb()
    const req = {
      original: null,
      schema: 'main',
      sql: 'DROP TABLE parent;',
      track: [],
      commitConfirmed: false,
    }
    expect(() => saveTable(db, req)).toThrow("couldn't be read")
    expect(getTableByName(db, main('parent'))).not.toBeNull()
  })

  it('with foreign keys on, asks to commit pending changes, then commits the change', () => {
    const db = openCoreTestDb()
    executeSql(db, 'PRAGMA foreign_keys = 1;', { dirty: false })
    executeSql(db, "INSERT INTO parent(name) VALUES ('dora');")
    const table = parseTable(tableDefinition(db, parent).sql)
    table.name = 'people'
    const req = {
      original: parent,
      schema: 'main',
      sql: table.sql('main'),
      track: [],
      commitConfirmed: false,
    }
    expect(saveTable(db, req)).toEqual({ kind: 'needsCommit' })
    expect(getTableByName(db, main('people'))).toBeNull()

    expect(saveTable(db, { ...req, commitConfirmed: true }).kind).toBe('done')
    expect(getTableByName(db, main('people'))).not.toBeNull()
    expect(isDirty(db)).toBe(false)
    expect(querySingleValue(db, 'PRAGMA foreign_keys')).toBe(1n)
  })
})

describe('indices and dropping', () => {
  it('creates an index from its CREATE statement', () => {
    const db = openCoreTestDb()
    createIndex(db, 'CREATE UNIQUE INDEX "idx_name" ON "parent" ("name" DESC) WHERE name <> \'\';')
    const idx = getIndexByName(db, main('idx_name'))!
    expect(idx.unique).toBe(true)
    expect(idx.whereExpr).toBe("name <> ''")
    expect(() => createIndex(db, 'DELETE FROM parent')).toThrow("couldn't be read")
  })

  it('drops tables, views, indices and triggers, quoting names', () => {
    const db = openCoreTestDb()
    dropObject(db, 'index', { schema: 'main', name: 'idx_child_parent' })
    dropObject(db, 'view', { schema: 'main', name: 'v_parent' })
    dropObject(db, 'trigger', { schema: 'main', name: 'trg' })
    dropObject(db, 'table', { schema: 'main', name: 'child' })
    expect(db.schemata.get('main')!.tables.has('child')).toBe(false)
    expect(db.schemata.get('main')!.indices.size).toBe(0)
    expect(() => dropObject(db, 'table', { schema: 'main', name: 'nope"; DROP TABLE parent; --' })).toThrow()
    expect(getTableByName(db, main('parent'))).not.toBeNull()
  })
})

describe('database info and pragmas', () => {
  it('reports page counts and pragma values', () => {
    const db = openCoreTestDb()
    const info = databaseInfo(db)
    expect(info.fileSize).toBe(info.pageSize * info.pageCount)
    expect(info.pragmas.user_version).toBe(0n)
    expect(info.pragmas.journal_mode).toBe('delete')
  })

  it('asks before committing, then sets the pragmas', () => {
    const db = openCoreTestDb()
    executeSql(db, "INSERT INTO parent(name) VALUES ('dora');")
    expect(setPragmas(db, { user_version: 5 }, false)).toEqual({ kind: 'needsCommit' })
    expect(setPragmas(db, { user_version: 5, foreign_keys: 1 }, true)).toEqual({ kind: 'done' })
    expect(isDirty(db)).toBe(false)
    expect(querySingleValue(db, 'PRAGMA user_version')).toBe(5n)
    expect(querySingleValue(db, 'PRAGMA foreign_keys')).toBe(1n)
    expect(() => setPragmas(db, { writable_schema: 1 }, true)).toThrow('Unknown pragma')
  })
})

describe('insertRecord', () => {
  it('types values by column affinity and leaves the rest to defaults', () => {
    const db = openCoreTestDb()
    const key = insertRecord(db, { schema: 'main', name: 'child' }, { id: '7', parent_id: null })
    expect(key).toBe(7n)
    expect(querySingleValue(db, 'SELECT typeof(id) || typeof(parent_id) FROM child WHERE id = 7')).toBe(
      'integernull',
    )
    expect(insertRecord(db, parent, {})).toBe(4n)
    expect(querySingleValue(db, 'SELECT name FROM parent WHERE id = 4')).toBe('x')
    expect(() => insertRecord(db, { schema: 'main', name: 'child' }, { total: '1' })).toThrow('generated')
  })
})
