import type { DbState } from '@shared/types/db'
import { MEMORY_DATABASE } from '@shared/types/db'
import { PROJECT_PRAGMAS } from '@shared/project/sqbpro'
import { attachDatabase, attachedDatabases, detachDatabase } from '../../core/db/attach'
import { getPragma } from '../../core/db/pragmas'
import {
  closeDatabase,
  createDatabase,
  openDatabase,
  saveDatabaseAs,
  sqliteVersion,
} from '../../core/db/connection'
import { releaseAllSavepoints, revertAll } from '../../core/db/savepoints'
import { updateSchema } from '../../core/db/schemaLoad'
import type { DbOptions } from '../../core/db/session'
import { setIdentifierQuoting, type EscapeQuoting } from '@shared/sqlb/identifier'
import { session, markStateChanged } from '../session'
import { buildDbState } from '../snapshot'

function applyOptions(options: DbOptions): void {
  session.options = options
  setIdentifierQuoting(options.identifierQuotes as EscapeQuoting)
}

/** Runs a state-changing action and returns the new state (also pushed as an event). */
function changing(fn: () => void): DbState {
  try {
    fn()
  } finally {
    markStateChanged()
  }
  return buildDbState(session)
}

export const dbHandlers = {
  'db.sqliteVersion': (): string => sqliteVersion(),

  'db.state': (): DbState => buildDbState(session),

  'db.open': (args: { path: string; readOnly: boolean; options: DbOptions }): DbState =>
    changing(() => {
      applyOptions(args.options)
      openDatabase(session, args.path, args.readOnly)
    }),

  'db.create': (args: { path: string; options: DbOptions }): DbState =>
    changing(() => {
      applyOptions(args.options)
      createDatabase(session, args.path)
    }),

  'db.openMemory': (args: { options: DbOptions }): DbState =>
    changing(() => {
      applyOptions(args.options)
      openDatabase(session, MEMORY_DATABASE)
    }),

  'db.close': (): DbState => changing(() => closeDatabase(session, true)),

  'db.write': (): DbState => changing(() => releaseAllSavepoints(session)),

  'db.revert': (): DbState =>
    changing(() => {
      revertAll(session)
      updateSchema(session)
    }),

  'db.saveAs': async (args: { path: string }): Promise<DbState> => {
    try {
      releaseAllSavepoints(session)
      await saveDatabaseAs(session, args.path)
    } finally {
      markStateChanged()
    }
    return buildDbState(session)
  },

  'db.attach': (args: { path: string; name: string }): DbState =>
    changing(() => attachDatabase(session, args.path, args.name)),

  'db.detach': (args: { name: string }): DbState => changing(() => detachDatabase(session, args.name)),

  'db.refreshSchema': (): DbState => changing(() => updateSchema(session)),

  /** What a project file stores about the open database (MainWindow._collect_project). */
  'db.projectInfo': (): {
    dbPath: string
    readOnly: boolean
    pragmas: Record<string, string>
    attached: [string, string][]
  } => ({
    dbPath: session.curFile,
    readOnly: session.readOnly,
    pragmas: Object.fromEntries(
      PROJECT_PRAGMAS.flatMap((name) => {
        const value = getPragma(session, name)
        return value === null ? [] : [[name, String(value)]]
      }),
    ),
    attached: attachedDatabases(session),
  }),
}
