// CSV import (ImportCsvDialog._import_file), data export (ExportDataDialog._export) and SQL dump /
// import (test_core.py::test_dump_roundtrip, MainWindow.import_sql), against real database files.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { importCsv, previewCsv } from '../../../../src/main/core/csv/csvImport'
import { dumpDatabase } from '../../../../src/main/core/db/dump'
import { querySingleValue } from '../../../../src/main/core/db/execute'
import { revertAll } from '../../../../src/main/core/db/savepoints'
import { getTableByName } from '../../../../src/main/core/db/schemaLoad'
import { isDirty } from '../../../../src/main/core/db/session'
import { exportToFile } from '../../../../src/main/core/exportData'
import { importSqlFile } from '../../../../src/main/core/importSql'
import type { CsvReadOptions } from '@shared/csv/csvOptions'
import type { ExportOptions } from '@shared/ipc/io'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'
import { tempDir } from '../../../fixtures/tempDir'

const csvOptions: CsvReadOptions = {
  separator: ',',
  quote: '"',
  trim: true,
  header: true,
  sanitizeNames: false,
  noTypeDetection: false,
  encoding: 'UTF-8',
}
const exportOptions: ExportOptions = {
  header: true,
  separator: ',',
  quote: '"',
  newline: '\n',
  prettyJson: false,
}

function file(name: string, content: string | Uint8Array): string {
  const path = join(tempDir(), name)
  writeFileSync(path, content)
  return path
}

describe('CSV import', () => {
  it('previews the header, guessed types and the first rows', () => {
    const content = String.fromCharCode(0xfeff) + 'id,name,score\n1,Ann,2.5\n2,"Bo, Jr",\n'
    const path = file('people.csv', content)
    expect(previewCsv(path, csvOptions)).toEqual({
      fields: [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'score', type: 'REAL' },
      ],
      rows: [
        ['1', 'Ann', '2.5'],
        ['2', 'Bo, Jr', ''],
      ],
      fileSize: Buffer.byteLength(content),
    })
  })

  it('creates a table, stores empty fields as NULL, and can be reverted', () => {
    const db = openCoreTestDb()
    const path = file('people.csv', 'id,name,score\n1,Ann,2.5\n2,"Bo, Jr",\n')
    const req = { path, table: 'people', options: csvOptions, conflict: '' as const, ignoreDefaults: false }
    expect(importCsv(db, req)).toEqual({ rows: 2 })
    expect(querySingleValue(db, "SELECT typeof(id) || typeof(score) FROM people WHERE name = 'Bo, Jr'")).toBe(
      'integernull',
    )
    expect(isDirty(db)).toBe(true)
    revertAll(db)
    expect(querySingleValue(db, "SELECT count(*) FROM sqlite_master WHERE name = 'people'")).toBe(0n)
  })

  it('appends to an existing table, filling empty fields with column defaults', () => {
    const db = openCoreTestDb()
    const path = file('more.csv', 'id;name\n10;\n11;Zed\n')
    const options = { ...csvOptions, separator: ';' }
    importCsv(db, { path, table: 'parent', options, conflict: '', ignoreDefaults: false })
    expect(querySingleValue(db, 'SELECT name FROM parent WHERE id = 10')).toBe('x')
    const clash = { path, table: 'parent', options, conflict: 'OR IGNORE' as const, ignoreDefaults: false }
    expect(importCsv(db, clash)).toEqual({ rows: 2 })
    expect(() => importCsv(db, { ...clash, conflict: '' })).toThrow(/around row 1.*UNIQUE/)
    expect(querySingleValue(db, 'SELECT count(*) FROM parent')).toBe(5n)
  })

  it('refuses an existing table with a different number of columns', () => {
    const db = openCoreTestDb()
    const path = file('wide.csv', 'a,b,c\n1,2,3\n')
    expect(() =>
      importCsv(db, { path, table: 'parent', options: csvOptions, conflict: '', ignoreDefaults: false }),
    ).toThrow(/same number of columns/)
  })

  it('decodes other encodings and streams large files', () => {
    const db = openCoreTestDb()
    const latin = file('latin.csv', new Uint8Array([0x6e, 0x0a, 0x63, 0x61, 0x66, 0xe9, 0x0a]))
    importCsv(db, {
      path: latin,
      table: 'words',
      options: { ...csvOptions, encoding: 'Windows-1252' },
      conflict: '',
      ignoreDefaults: false,
    })
    expect(querySingleValue(db, 'SELECT n FROM words')).toBe('café')

    const lines = ['n,text']
    for (let i = 0; i < 60_000; i++) lines.push(`${i},"row ${i} with some padding text"`)
    const big = file('big.csv', lines.join('\n'))
    const result = importCsv(db, {
      path: big,
      table: 'big',
      options: csvOptions,
      conflict: '',
      ignoreDefaults: false,
    })
    expect(result.rows).toBe(60_000)
    expect(querySingleValue(db, 'SELECT max(n) FROM big')).toBe(59_999n)
  })
})

describe('data export', () => {
  let dir = ''
  beforeEach(() => {
    dir = tempDir()
  })
  const out = (name: string): string => join(dir, name)

  it('writes a table as CSV, JSON, SQL and Markdown', () => {
    const db = openCoreTestDb()
    const source = { kind: 'table' as const, ref: { schema: 'main', name: 'parent' } }
    expect(exportToFile(db, source, out('p.csv'), 'csv', exportOptions)).toBe(3)
    expect(readFileSync(out('p.csv'), 'utf8')).toBe('"id","name"\n1,alice\n2,bob\n3,carl\n')

    exportToFile(db, source, out('p.json'), 'json', exportOptions)
    expect(JSON.parse(readFileSync(out('p.json'), 'utf8'))).toEqual([
      { id: 1, name: 'alice' },
      { id: 2, name: 'bob' },
      { id: 3, name: 'carl' },
    ])

    exportToFile(db, source, out('p.sql'), 'sql', exportOptions)
    expect(readFileSync(out('p.sql'), 'utf8')).toContain(
      `INSERT INTO "parent" ("id","name") VALUES (1,'alice');`,
    )

    exportToFile(db, source, out('p.md'), 'md', { ...exportOptions, header: false })
    expect(readFileSync(out('p.md'), 'utf8').split('\n').slice(0, 3)).toEqual([
      '| id | name |',
      '| --- | --- |',
      '| 1 | alice |',
    ])
  })

  it('exports a table as filtered and sorted in its tab, without the row key', () => {
    const db = openCoreTestDb()
    const query = {
      table: { schema: 'main', name: 'parent' },
      filters: { name: '<>bob' },
      globalFilter: '',
      sort: [{ column: 'id', direction: 'desc' as const }],
      pseudoPk: [],
      filterEscape: '',
      displayFormats: {},
      condFormats: [],
    }
    exportToFile(db, { kind: 'browse', query }, out('f.csv'), 'csv', { ...exportOptions, header: false })
    expect(readFileSync(out('f.csv'), 'utf8')).toBe('3,carl\n1,alice\n')
  })

  it('exports the rows of a statement, and refuses one without rows', () => {
    const db = openCoreTestDb()
    const sql = { kind: 'sql' as const, sql: 'SELECT count(*) AS n FROM parent;', name: 'result' }
    exportToFile(db, sql, out('n.tsv'), 'tsv', exportOptions)
    expect(readFileSync(out('n.tsv'), 'utf8')).toBe('"n"\n3\n')
    const write = { kind: 'sql' as const, sql: 'DELETE FROM parent', name: 'x' }
    expect(() => exportToFile(db, write, out('x.csv'), 'csv', exportOptions)).toThrow(/no rows/)
    expect(querySingleValue(db, 'SELECT count(*) FROM parent')).toBe(3n)
  })

  it('round-trips a CSV export through the import', () => {
    const db = openCoreTestDb()
    const path = out('child.csv')
    exportToFile(db, { kind: 'table', ref: { schema: 'main', name: 'parent' } }, path, 'csv', exportOptions)
    importCsv(db, { path, table: 'copy', options: csvOptions, conflict: '', ignoreDefaults: false })
    expect(querySingleValue(db, "SELECT group_concat(id || ':' || name, ' ') FROM copy")).toBe(
      '1:alice 2:bob 3:carl',
    )
  })
})

describe('SQL dump and import', () => {
  it('imports a dump into another database as one undoable change', () => {
    const source = openCoreTestDb()
    const path = join(tempDir(), 'dump.sql')
    const tables = [...source.schemata.get('main')!.tables.keys()].filter((n) => !n.startsWith('sqlite_'))
    dumpDatabase(source, path, {
      tables,
      insertColumnNames: true,
      insertMultipleRows: false,
      keepOriginal: false,
      exportSchema: true,
      exportData: true,
      keepOldSchema: false,
    })
    const target = openCoreTestDb()
    for (const t of ['child', 'parent', 'wr']) {
      importSqlFile(target, file('drop.sql', `DROP VIEW IF EXISTS v_parent; DROP TABLE ${t};`))
    }
    importSqlFile(target, path)
    expect(querySingleValue(target, 'SELECT count(*) FROM parent')).toBe(3n)
    expect(getTableByName(target, new ObjectIdentifier('main', 'v_parent'))).not.toBeNull()
    revertAll(target)
    expect(querySingleValue(target, 'SELECT count(*) FROM parent')).toBe(3n)
    expect(isDirty(target)).toBe(false)
  })
})
