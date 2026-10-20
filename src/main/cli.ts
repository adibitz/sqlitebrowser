// Port of reference/sqliteview/app.py (parse_args): command line flags. Chromium and Electron
// switches that also reach argv (--inspect, --no-sandbox, …) are ignored.
import { isAbsolute, resolve } from 'node:path'
import type { StartupRequest } from '@shared/types/app'

export const USAGE = `Usage: sqliteview [options] [database]

Opens a SQLite database, or a DB Browser for SQLite project file (.sqbpro).

Options:
  -R, --read-only     open the database read-only
  -t, --table TABLE   browse this table after opening
  -s, --sql FILE      open a SQL file in an editor tab and run it
  -q, --quit          exit after running the SQL file (with --sql), writing its changes
  -h, --help          show this help
      --version       show the version`

export interface CliResult {
  request: StartupRequest
  /** Text to print instead of starting (help, version, a usage error). */
  print?: string
  exitCode?: number
}

export function emptyRequest(): StartupRequest {
  return { database: null, readOnly: false, table: null, sql: null, quit: false }
}

/** Parses the arguments after the executable (and the app path in development). */
export function parseCli(args: readonly string[], cwd: string, version: string): CliResult {
  const request = emptyRequest()
  const absolute = (p: string): string => (isAbsolute(p) ? p : resolve(cwd, p))
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const [flag, inline] =
      arg.startsWith('--') && arg.includes('=')
        ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
        : [arg, undefined]
    const value = (): string | null => inline ?? args[++i] ?? null
    switch (flag) {
      case '-h':
      case '--help':
        return { request, print: USAGE, exitCode: 0 }
      case '--version':
        return { request, print: `sqliteview ${version}`, exitCode: 0 }
      case '-R':
      case '--read-only':
        request.readOnly = true
        break
      case '-q':
      case '--quit':
        request.quit = true
        break
      case '-t':
      case '--table':
      case '-s':
      case '--sql': {
        const v = value()
        if (!v) return { request, print: `${flag} needs a value.\n\n${USAGE}`, exitCode: 2 }
        if (flag === '-t' || flag === '--table') request.table = v
        else request.sql = absolute(v)
        break
      }
      default:
        if (arg.startsWith('-')) break // a Chromium or Electron switch
        request.database ??= absolute(arg)
    }
  }
  return { request }
}

export function hasRequest(r: StartupRequest): boolean {
  return r.database !== null || r.sql !== null
}
