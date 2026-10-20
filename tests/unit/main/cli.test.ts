// Port of reference/sqliteview/app.py::parse_args, plus the Electron and Chromium switches that also
// reach argv.
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasRequest, parseCli } from '../../../src/main/cli'

const cwd = resolve('/work')
const parse = (...args: string[]) => parseCli(args, cwd, '1.2.3')

describe('command line', () => {
  it('reads the database, flags and values, in any order', () => {
    expect(parse('-R', 'data/demo.db', '--table', 'customers', '--sql=q.sql', '-q').request).toEqual({
      database: join(cwd, 'data', 'demo.db'),
      readOnly: true,
      table: 'customers',
      sql: join(cwd, 'q.sql'),
      quit: true,
    })
    expect(parse('-t', 'orders', resolve('/abs/x.sqbpro')).request.database).toBe(resolve('/abs/x.sqbpro'))
  })

  it('ignores switches meant for Electron and Chromium', () => {
    const { request, print } = parse('--inspect=0', '--remote-debugging-port=0', '--no-sandbox', 'a.db')
    expect(print).toBeUndefined()
    expect(request.database).toBe(join(cwd, 'a.db'))
    expect(hasRequest(parse('--no-sandbox').request)).toBe(false)
  })

  it('prints help, the version, or what is missing', () => {
    expect(parse('--help')).toMatchObject({ exitCode: 0, print: expect.stringContaining('--read-only') })
    expect(parse('--version')).toMatchObject({ exitCode: 0, print: 'sqliteview 1.2.3' })
    expect(parse('-s')).toMatchObject({ exitCode: 2, print: expect.stringContaining('-s needs a value') })
  })
})
