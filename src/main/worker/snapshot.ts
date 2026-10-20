import type { DbState } from '@shared/types/db'
import type { ColumnInfo, SchemaInfo, TableInfo, TableKind } from '@shared/types/schema'
import { runStatement } from '../core/db/execute'
import { isDirty, type DbSession, type ObjectMap } from '../core/db/session'
import type { Table } from '@shared/sqlb/table'

function tableKind(name: string, t: Table): TableKind {
  if (name.startsWith('sqlite_')) return 'system'
  if (t.isView()) return 'view'
  if (t.isVirtual()) return 'virtual'
  return 'table'
}

function columns(t: Table): ColumnInfo[] {
  const pk = new Set(t.primaryKeyNames())
  return t.fields.map((f) => ({
    name: f.name,
    type: f.type,
    notNull: f.notNull,
    primaryKey: pk.has(f.name),
    unique: f.unique,
    defaultValue: f.defaultValue,
    check: f.check,
    collation: f.collation,
    foreignKey: t.foreignKey([f.name])?.toString() ?? null,
    generated: f.generated ? `${f.generated.storage}: ${f.generated.expression}` : null,
  }))
}

function schemaInfo(name: string, objmap: ObjectMap): SchemaInfo {
  const tables: TableInfo[] = [...objmap.tables].map(([tableName, t]) => ({
    schema: name,
    name: tableName,
    kind: tableKind(tableName, t),
    columns: columns(t),
    sql: t.originalSql,
    withoutRowid: t.withoutRowid,
    rowidColumns: t.rowidColumns(),
    autoIncrement: t.primaryKey()?.autoIncrement ?? false,
  }))
  return {
    name,
    tables,
    indices: [...objmap.indices].map(([indexName, i]) => ({
      schema: name,
      name: indexName,
      table: i.baseTable(),
      unique: i.unique,
      columns: i.fields.map((c) => c.name + (c.order ? ` ${c.order}` : '')),
      where: i.whereExpr,
      sql: i.originalSql,
    })),
    triggers: [...objmap.triggers].map(([triggerName, t]) => ({
      schema: name,
      name: triggerName,
      table: t.baseTable(),
      sql: t.originalSql,
    })),
  }
}

function encoding(session: DbSession): string {
  try {
    return String(runStatement(session, 'PRAGMA encoding;').rows?.[0]?.[0] ?? '')
  } catch {
    return ''
  }
}

/** Serialisable state of the session for the UI. */
export function buildDbState(session: DbSession): DbState {
  if (!session.conn) {
    return { isOpen: false, path: '', readOnly: false, dirty: false, encoding: '', schemata: [] }
  }
  return {
    isOpen: true,
    path: session.curFile,
    readOnly: session.readOnly,
    dirty: isDirty(session),
    encoding: encoding(session),
    schemata: [...session.schemata].map(([name, objmap]) => schemaInfo(name, objmap)),
  }
}
