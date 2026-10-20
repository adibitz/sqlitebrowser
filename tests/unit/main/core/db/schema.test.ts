// Port of reference/tests/test_core.py::test_open_and_schema and the open/close behaviour.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase } from '../../../../../src/main/core/db/connection'
import { getTableByName } from '../../../../../src/main/core/db/schemaLoad'
import { createSession } from '../../../../../src/main/core/db/session'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { makeDbFile, openCoreTestDb } from '../../../../fixtures/coreTestDb'
import { tempDir } from '../../../../fixtures/tempDir'

describe('opening a database', () => {
  it('reads tables, views, indices and triggers', () => {
    const db = openCoreTestDb()
    const main = db.schemata.get('main')!
    for (const name of ['parent', 'child', 'v_parent', 'wr', 'sqlite_master'])
      expect(main.tables.has(name)).toBe(true)
    expect(main.indices.has('idx_child_parent')).toBe(true)
    expect(main.triggers.has('trg')).toBe(true)

    const child = main.tables.get('child')!
    expect(child.fullyParsed).toBe(true)
    expect(child.fieldNames()).toEqual(['id', 'parent_id', 'weird "name"', 'total'])
    expect(child.foreignKey(['parent_id'])?.table).toBe('parent')
    expect(main.tables.get('v_parent')!.isView()).toBe(true)
    expect(main.tables.get('v_parent')!.fieldNames()).toEqual(['id', 'name'])
    expect(main.tables.get('wr')!.rowidColumns()).toEqual(['a', 'b'])
  })

  it('finds objects case-insensitively', () => {
    const db = openCoreTestDb()
    expect(getTableByName(db, new ObjectIdentifier('MAIN', 'PARENT'))?.name).toBe('parent')
  })

  it('refuses a file that is not a SQLite database', () => {
    const path = join(tempDir(), 'not.db')
    writeFileSync(path, 'this is plain text, not a database file at all, padded to look big enough')
    const session = createSession()
    expect(() => openDatabase(session, path)).toThrow(/not a database/)
    expect(session.conn).toBeNull()
  })

  it('opens read-only on request', () => {
    const session = createSession()
    openDatabase(session, makeDbFile('CREATE TABLE a(b);'), true)
    expect(session.readOnly).toBe(true)
    closeDatabase(session, true)
  })

  it('will not close with pending changes unless forced', () => {
    const db = openCoreTestDb()
    db.savepoints.push('RESTOREPOINT')
    db.conn!.exec('SAVEPOINT "RESTOREPOINT"')
    expect(closeDatabase(db)).toBe(false)
    expect(closeDatabase(db, true)).toBe(true)
    expect(db.conn).toBeNull()
  })
})
