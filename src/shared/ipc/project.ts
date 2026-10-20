import { z } from 'zod'
import type { Project } from '../project/sqbpro'

export const projectChannels = {
  open: 'project:open',
  save: 'project:save',
} as const

const path = z.string().min(1).max(4096)
const name = z.string().min(1).max(512)
const objectRef = z.object({ schema: name, name })
const index = z.number().int().min(0).max(1_000_000)

const tableSettings = z.object({
  sort: z.array(z.tuple([index, z.number().int().min(0).max(1)])).max(100),
  filters: z.record(z.string().regex(/^\d+$/), z.string().max(2000)),
  globalFilters: z.array(z.string().max(2000)).max(100),
  columnWidths: z.record(z.string().regex(/^\d+$/), z.number().int().min(0).max(100_000)),
  unlockViewPk: z.string().max(512),
})

/** The workspace part of a project; the database part comes from the DB worker. */
export const projectTabsSchema = z.object({
  tables: z.array(objectRef).max(1000),
  tableSettings: z.array(z.object({ table: objectRef, settings: tableSettings })).max(1000),
  sqlTabs: z
    .array(
      z.object({
        name: z.string().max(512),
        text: z.string().max(64 * 1024 * 1024),
        filename: z.string().max(4096),
      }),
    )
    .max(1000),
  currentSqlTab: z.number().int().min(0),
  documents: z.array(z.object({ kind: z.enum(['table', 'sql', 'info']), index })).max(2000),
  currentDocument: z.number().int().min(-1),
})
export type ProjectTabs = z.infer<typeof projectTabsSchema>

export const projectSchemas = {
  /** null asks for the file. */
  open: z.object({ path: path.nullable() }),
  save: z.object({
    /** Where to save; null asks (Save project as). */
    path: path.nullable(),
    /** Suggested name when asking. */
    defaultName: z.string().min(1).max(255),
    tabs: projectTabsSchema,
  }),
}

export interface OpenedProject {
  path: string
  /** Database and attached paths are resolved against the project's folder. */
  project: Project
}

export interface ProjectApi {
  /** Reads a project file (asking for it when `path` is null); null when cancelled. */
  open(req: z.infer<typeof projectSchemas.open>): Promise<OpenedProject | null>
  /** Saves the open database and these tabs as a project; returns the path, or null when cancelled. */
  save(req: z.infer<typeof projectSchemas.save>): Promise<string | null>
}
