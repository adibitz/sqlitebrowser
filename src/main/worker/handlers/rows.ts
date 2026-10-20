import type { BrowseQuery } from '@shared/types/rows'
import type { SqlValue } from '@shared/types/values'
import { addRecord, deleteRecords } from '../../core/db/records'
import { validateDisplayFormat } from '../../core/displayFormat'
import { setUndoSavepoint } from '../../core/db/savepoints'
import { ObjectIdentifier } from '@shared/sqlb/identifier'
import { countRows, duplicateRow, insertRecord, readRows, setCell, type CellUpdate } from '../../core/rows'
import { session } from '../session'

type Ref = { schema: string; name: string }
const id = (ref: Ref): ObjectIdentifier => new ObjectIdentifier(ref.schema, ref.name)

export const rowsHandlers = {
  'rows.count': (query: BrowseQuery): number => countRows(session, query),

  'rows.page': (args: { query: BrowseQuery; offset: number; limit: number }): SqlValue[][] =>
    readRows(session, args.query, args.offset, args.limit),

  'rows.update': (args: CellUpdate): SqlValue => setCell(session, args),

  'rows.add': (args: { table: Ref; values?: Record<string, string | null> }): SqlValue =>
    args.values ? insertRecord(session, args.table, args.values) : addRecord(session, id(args.table)),

  'rows.remove': (args: { table: Ref; keys: SqlValue[]; pseudoPk: string[] }): void => {
    setUndoSavepoint(session)
    deleteRecords(session, id(args.table), args.keys, args.pseudoPk)
  },

  'rows.duplicate': (args: { table: Ref; key: SqlValue }): SqlValue =>
    duplicateRow(session, args.table, args.key),

  'rows.validateDisplayFormat': (args: { table: Ref; column: string; selector: string }): string =>
    validateDisplayFormat(session, args.table, args.column, args.selector),
}
