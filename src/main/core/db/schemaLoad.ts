// Port of reference/sqliteview/core/db.py (update_schema, _query_column_information, get_*_by_name).
import { parseIndex } from '@shared/parser/createIndex'
import { parseTable } from '@shared/parser/createTable'
import { parseTrigger, parseView } from '@shared/parser/objects'
import { Field } from '@shared/sqlb/field'
import { escapeIdentifier, type ObjectIdentifier } from '@shared/sqlb/identifier'
import type { Index } from '@shared/sqlb/indexDef'
import { Table } from '@shared/sqlb/table'
import type { Trigger } from '@shared/sqlb/trigger'
import { logSql, runStatement } from './execute'
import { emptyObjectMap, type DbSession, type ObjectMap } from './session'

const MASTER_COLUMNS: [string, string][] = [
  ['type', 'text'],
  ['name', 'text'],
  ['tbl_name', 'text'],
  ['rootpage', 'integer'],
  ['sql', 'text'],
]

function columnInformation(
  session: DbSession,
  schema: string,
  name: string,
  pragma: 'TABLE_INFO' | 'TABLE_XINFO' = 'TABLE_INFO',
): [string, string][] {
  const sql = `PRAGMA ${escapeIdentifier(schema)}.${pragma}(${escapeIdentifier(name)});`
  logSql(session, sql)
  try {
    return (runStatement(session, sql).rows ?? []).map((r) => [String(r[1]), (r[2] as string | null) ?? ''])
  } catch {
    return []
  }
}

function fieldsFrom(cols: [string, string][]): Field[] {
  return cols.map(([n, type]) => new Field(n, type))
}

function loadTableOrView(session: DbSession, schema: string, type: string, name: string, sql: string): Table {
  let t: Table = type === 'table' ? parseTable(sql) : parseView(sql)
  if (!t.fullyParsed) t.name = name
  if ((!t.fullyParsed && !t.fields.length) || t.isVirtual()) {
    t.fields = fieldsFrom(columnInformation(session, schema, name))
  } else if (t.fullyParsed) {
    // Safety net: the parser must agree with SQLite on the column list (table_xinfo also lists
    // generated columns). If not, fall back to the PRAGMA columns, like upstream.
    const cols = columnInformation(session, schema, name, 'TABLE_XINFO')
    const names = t.fieldNames()
    if (cols.length !== names.length || cols.some(([n], i) => n !== names[i])) {
      const fallback = new Table(name)
      fallback.originalSql = sql
      fallback.fields = fieldsFrom(cols)
      t = fallback
    }
  }
  return t
}

function loadSchema(session: DbSession, schemaName: string): ObjectMap {
  const objmap = emptyObjectMap()
  const statement =
    schemaName === 'temp'
      ? 'SELECT type,name,sql,tbl_name FROM sqlite_temp_master;'
      : `SELECT type,name,sql,tbl_name FROM ${escapeIdentifier(schemaName)}.sqlite_master;`
  logSql(session, statement)
  let rows: unknown[][]
  try {
    rows = runStatement(session, statement).rows ?? []
  } catch {
    return objmap
  }
  for (const [type, name, rawSql, tblName] of rows as [string, string, string | null, string][]) {
    if (!rawSql) continue
    const sql = rawSql.replaceAll('\r', '')
    if (type === 'table' || type === 'view') {
      objmap.tables.set(name, loadTableOrView(session, schemaName, type, name, sql))
    } else if (type === 'index') {
      const idx = parseIndex(sql)
      if (!idx.fullyParsed) {
        idx.name = name
        idx.table = tblName
      }
      objmap.indices.set(name, idx)
    } else if (type === 'trigger') {
      const trg = parseTrigger(sql)
      trg.name = name
      trg.table = tblName
      objmap.triggers.set(name, trg)
    }
  }
  // The built-in schema table is browsable too (upstream shows it in the tree).
  const master = schemaName === 'temp' ? 'sqlite_temp_master' : 'sqlite_master'
  if (!objmap.tables.has(master)) {
    const mt = new Table(master)
    mt.fields = fieldsFrom(MASTER_COLUMNS)
    mt.originalSql = `CREATE TABLE ${master} (\n  type text,\n  name text,\n  tbl_name text,\n  rootpage integer,\n  sql text\n)`
    objmap.tables.set(master, mt)
  }
  return objmap
}

/** Re-reads every schema object of every attached database. */
export function updateSchema(session: DbSession): void {
  session.schemata = new Map()
  if (session.conn) {
    let dbs: unknown[][]
    try {
      dbs = runStatement(session, 'PRAGMA database_list;').rows ?? []
    } catch {
      dbs = []
    }
    logSql(session, 'PRAGMA database_list;')
    for (const [, schemaName] of dbs as [unknown, string][]) {
      session.schemata.set(schemaName, loadSchema(session, schemaName))
    }
  }
  session.events.structureUpdated?.()
}

function findCi<V>(map: Map<string, V> | undefined, key: string): V | null {
  if (!map) return null
  const exact = map.get(key)
  if (exact !== undefined) return exact
  const lk = key.toLowerCase()
  for (const [k, v] of map) if (k.toLowerCase() === lk) return v
  return null
}

export function getSchema(session: DbSession, schema: string): ObjectMap | null {
  return findCi(session.schemata, schema)
}

export function getTableByName(session: DbSession, name: ObjectIdentifier): Table | null {
  if (!session.schemata.size || !name.schema || !name.name) return null
  return findCi(getSchema(session, name.schema)?.tables, name.name)
}

export function getIndexByName(session: DbSession, name: ObjectIdentifier): Index | null {
  return findCi(getSchema(session, name.schema)?.indices, name.name)
}

export function getTriggerByName(session: DbSession, name: ObjectIdentifier): Trigger | null {
  return findCi(getSchema(session, name.schema)?.triggers, name.name)
}
