// Port of reference/sqliteview/core/db.py (DBBrowserDB state, ObjectMap, LogMessageType).
// The Python class is split into functions over this session object, one file per concern.
import type Database from 'better-sqlite3'
import type { Index } from '@shared/sqlb/indexDef'
import type { Table } from '@shared/sqlb/table'
import type { Trigger } from '@shared/sqlb/trigger'

export enum LogMessageType {
  User = 0,
  App = 1,
  ErrorLog = 2,
}

/** Objects of one schema (main, temp, or an attached database). Tables include views. */
export interface ObjectMap {
  tables: Map<string, Table>
  indices: Map<string, Index>
  triggers: Map<string, Trigger>
}

export function emptyObjectMap(): ObjectMap {
  return { tables: new Map(), indices: new Map(), triggers: new Map() }
}

/** Settings the engine reads (the Python version read them from QSettings directly). */
export interface DbOptions {
  foreignKeys: boolean
  disableRegex: boolean
  defaultSqlText: string
  defaultEncoding: string
  extensions: string[]
  /** 0 "double", 1 `grave`, 2 [square] ('editor/identifier_quotes'). */
  identifierQuotes: number
}

export const DEFAULT_DB_OPTIONS: DbOptions = {
  foreignKeys: true,
  disableRegex: false,
  defaultSqlText: '',
  defaultEncoding: 'UTF-8',
  extensions: [],
  identifierQuotes: 0,
}

/** Replaces the Qt signals (sqlExecuted, dbChanged, structureUpdated) and the warning dialog hook. */
export interface DbEvents {
  log?: (sql: string, type: LogMessageType) => void
  dirtyChanged?: (dirty: boolean) => void
  structureUpdated?: () => void
  warning?: (message: string) => void
}

export interface DbSession {
  conn: Database.Database | null
  curFile: string
  readOnly: boolean
  savepoints: string[]
  schemata: Map<string, ObjectMap>
  structureChecksDisabled: number
  tempCounter: number
  options: DbOptions
  events: DbEvents
}

export function createSession(options: Partial<DbOptions> = {}, events: DbEvents = {}): DbSession {
  return {
    conn: null,
    curFile: '',
    readOnly: false,
    savepoints: [],
    schemata: new Map(),
    structureChecksDisabled: 0,
    tempCounter: 0,
    options: { ...DEFAULT_DB_OPTIONS, ...options },
    events,
  }
}

export function isDirty(session: DbSession): boolean {
  return session.savepoints.length > 0
}

/** The open connection, or an error the user can read. */
export function requireConn(session: DbSession): Database.Database {
  if (!session.conn) throw new Error('No database file opened')
  return session.conn
}

/** Runs `fn` without re-reading the schema after DDL (used while alterTable rebuilds a table). */
export function withoutStructureChecks<T>(session: DbSession, fn: () => T): T {
  session.structureChecksDisabled++
  try {
    return fn()
  } finally {
    session.structureChecksDisabled--
  }
}
