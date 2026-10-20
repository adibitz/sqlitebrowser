import type { ObjectRef } from '@shared/types/schema'
import {
  describeTable,
  listTables,
  runQuery,
  runSql,
  sampleRows,
  type TableListing,
  type ToolTable,
} from '../../core/aiTools'
import { session } from '../session'

/** The database side of the AI's MCP tools. */
export const aiHandlers = {
  'ai.listTables': (): TableListing[] => listTables(session),
  'ai.describeTable': (ref: ObjectRef): ReturnType<typeof describeTable> => describeTable(session, ref),
  'ai.sampleRows': (args: { table: ObjectRef; limit: number }): ToolTable =>
    sampleRows(session, args.table, args.limit),
  'ai.runQuery': (args: { sql: string }): ToolTable => runQuery(session, args.sql),
  'ai.runSql': (args: { sql: string }): { changes: number } => runSql(session, args.sql),
}
