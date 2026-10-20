import type {
  DatabaseInfo,
  DroppableKind,
  PragmaChanges,
  SchemaChangeResult,
  TableDefinition,
} from '@shared/ipc/schema'
import type { ObjectRef } from '@shared/types/schema'
import {
  createIndex,
  databaseInfo,
  dropObject,
  saveTable,
  setPragmas,
  tableDefinition,
  type SaveTableRequest,
} from '../../core/schemaEdit'
import { markStateChanged, session } from '../session'

export const schemaHandlers = {
  'schema.tableDefinition': (ref: ObjectRef): TableDefinition => tableDefinition(session, ref),

  'schema.saveTable': (req: SaveTableRequest): SchemaChangeResult => saveTable(session, req),

  'schema.createIndex': (req: { sql: string }): void => createIndex(session, req.sql),

  'schema.drop': (req: { kind: DroppableKind; ref: ObjectRef }): void =>
    dropObject(session, req.kind, req.ref),

  'schema.info': (): DatabaseInfo => databaseInfo(session),

  'schema.setPragmas': (req: { values: PragmaChanges; commitConfirmed: boolean }): SchemaChangeResult => {
    try {
      return setPragmas(session, req.values, req.commitConfirmed)
    } finally {
      markStateChanged()
    }
  },
}
