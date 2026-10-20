import { z } from 'zod'
import { PRAGMA_NAMES, type PragmaValue } from '../schema/pragmas'
import type { ObjectRef } from '../types/schema'
import type { SqlValue } from '../types/values'

export const schemaChannels = {
  tableDefinition: 'schema:tableDefinition',
  saveTable: 'schema:saveTable',
  createIndex: 'schema:createIndex',
  drop: 'schema:drop',
  info: 'schema:info',
  setPragmas: 'schema:setPragmas',
} as const

const name = z.string().min(1).max(512)
const objectRef = z.object({ schema: name, name })
const createSql = z
  .string()
  .min(1)
  .max(1024 * 1024)
const columnName = z.string().max(512).nullable()

export const droppableKinds = ['table', 'view', 'index', 'trigger'] as const
export type DroppableKind = (typeof droppableKinds)[number]

export const schemaSchemas = {
  tableDefinition: objectRef,
  saveTable: z.object({
    /** The table being modified, or null to create `sql` as a new table. */
    original: objectRef.nullable(),
    schema: name,
    /** CREATE TABLE statement of the table as it should look. */
    sql: createSql,
    /** [old, new] column names: [a, b] rename, [a, null] drop, [null, b] add. */
    track: z.array(z.tuple([columnName, columnName])).max(10_000),
    commitConfirmed: z.boolean(),
  }),
  createIndex: z.object({ sql: createSql }),
  drop: z.object({ kind: z.enum(droppableKinds), ref: objectRef }),
  info: z.undefined(),
  setPragmas: z.object({
    values: z.partialRecord(
      z.enum(PRAGMA_NAMES as [string, ...string[]]),
      z.union([z.number().finite(), z.string().max(32)]),
    ),
    commitConfirmed: z.boolean(),
  }),
}

/** The table as the engine sees it, as a CREATE statement the dialog can parse. */
export interface TableDefinition {
  sql: string
  /** False when the original CREATE statement couldn't be fully parsed; editing may lose details. */
  fullyParsed: boolean
}

/** `needsCommit`: pending changes must be written first; ask, then call again with commitConfirmed. */
export type SchemaChangeResult = { kind: 'done'; ref?: ObjectRef } | { kind: 'needsCommit' }

export interface DatabaseInfo {
  /** Bytes on disk; 0 for in-memory databases. */
  fileSize: number
  pageSize: number
  pageCount: number
  freePages: number
  pragmas: Record<string, SqlValue>
}

export type PragmaChanges = Partial<Record<string, PragmaValue>>

export interface SchemaApi {
  tableDefinition(ref: ObjectRef): Promise<TableDefinition>
  /** Creates or alters a table (upstream EditTableDialog.accept), with an undo point. */
  saveTable(req: z.infer<typeof schemaSchemas.saveTable>): Promise<SchemaChangeResult>
  createIndex(req: z.infer<typeof schemaSchemas.createIndex>): Promise<void>
  drop(req: z.infer<typeof schemaSchemas.drop>): Promise<void>
  info(): Promise<DatabaseInfo>
  /** Sets pragmas; most of them commit pending changes first. */
  setPragmas(req: z.infer<typeof schemaSchemas.setPragmas>): Promise<SchemaChangeResult>
}
