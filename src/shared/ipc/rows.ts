import { z } from 'zod'
import type { BrowseQuery } from '../types/rows'
import type { SqlValue } from '../types/values'

export const rowsChannels = {
  count: 'rows:count',
  page: 'rows:page',
  update: 'rows:update',
  add: 'rows:add',
  remove: 'rows:remove',
  duplicate: 'rows:duplicate',
  validateDisplayFormat: 'rows:validateDisplayFormat',
} as const

/** Upper bound for one page request; the grid asks for chunks well below this. */
export const MAX_PAGE_ROWS = 10_000

const name = z.string().min(1).max(512)
const objectRef = z.object({ schema: name, name })
export const bytesSchema = z.custom<Uint8Array>((v) => v instanceof Uint8Array, 'Expected bytes')
export const sqlValueSchema = z.union([z.null(), z.bigint(), z.number(), z.string(), bytesSchema])

export const browseQuerySchema = z.object({
  table: objectRef,
  filters: z.record(name, z.string().max(2000)),
  globalFilter: z.string().max(2000),
  sort: z.array(z.object({ column: name, direction: z.enum(['asc', 'desc']) })).max(16),
  pseudoPk: z.array(name).max(16),
  filterEscape: z.string().max(1),
  displayFormats: z.record(name, z.string().min(1).max(10_000)),
  condFormats: z.array(z.object({ column: name, filters: z.array(z.string().max(2000)).max(100) })).max(500),
}) satisfies z.ZodType<BrowseQuery>

export const rowsSchemas = {
  count: browseQuerySchema,
  page: z.object({
    query: browseQuerySchema,
    offset: z.number().int().min(0),
    limit: z.number().int().min(1).max(MAX_PAGE_ROWS),
  }),
  update: z.object({
    table: objectRef,
    column: name,
    key: sqlValueSchema,
    value: z.union([z.null(), z.string(), bytesSchema]),
    pseudoPk: z.array(name).max(16),
  }),
  add: z.object({
    table: objectRef,
    /** Typed text per column (null = NULL); columns left out get their default. */
    values: z
      .record(
        name,
        z
          .string()
          .max(1024 * 1024)
          .nullable(),
      )
      .optional(),
  }),
  remove: z.object({
    table: objectRef,
    keys: z.array(sqlValueSchema).min(1).max(100_000),
    pseudoPk: z.array(name).max(16),
  }),
  duplicate: z.object({ table: objectRef, key: sqlValueSchema }),
  validateDisplayFormat: z.object({
    table: objectRef,
    column: name,
    selector: z.string().min(1).max(10_000),
  }),
}

export interface RowsApi {
  /** Rows matching the filters. */
  count(query: BrowseQuery): Promise<number>
  /** Rows [offset, offset + limit) in sort order; column 0 is the row key. */
  page(req: z.infer<typeof rowsSchemas.page>): Promise<SqlValue[][]>
  /** Sets one cell from typed text (or null / bytes) and returns the value as stored. */
  update(req: z.infer<typeof rowsSchemas.update>): Promise<SqlValue>
  /** Inserts a record (empty, or with `values`); returns its key. */
  add(req: z.infer<typeof rowsSchemas.add>): Promise<SqlValue>
  remove(req: z.infer<typeof rowsSchemas.remove>): Promise<void>
  /** Copies a record's values into a new one; returns the new key. */
  duplicate(req: z.infer<typeof rowsSchemas.duplicate>): Promise<SqlValue>
  /** Checks a display format against the table; '' when it can be used, else what is wrong. */
  validateDisplayFormat(req: z.infer<typeof rowsSchemas.validateDisplayFormat>): Promise<string>
}
