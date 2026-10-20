import type { ObjectRef } from '@shared/types/schema'
import {
  describeTable,
  listTables,
  runQuery,
  runSql,
  sampleRows,
  type TableListing,
  type ToolTable,
} from '../../core/mcpTools'
import { session } from '../session'

/** The database side of the MCP tools. */
export const mcpHandlers = {
  'mcp.listTables': (): TableListing[] => listTables(session),
  'mcp.describeTable': (ref: ObjectRef): ReturnType<typeof describeTable> => describeTable(session, ref),
  'mcp.sampleRows': (args: { table: ObjectRef; limit: number }): ToolTable =>
    sampleRows(session, args.table, args.limit),
  'mcp.runQuery': (args: { sql: string }): ToolTable => runQuery(session, args.sql),
  'mcp.runSql': (args: { sql: string }): { changes: number } => runSql(session, args.sql),
}
