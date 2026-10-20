import { describe, expect, it } from 'vitest'
import { schemaSchemas } from '@shared/ipc/schema'

describe('schema IPC validation', () => {
  it('accepts a few known pragmas and refuses others', () => {
    const ok = schemaSchemas.setPragmas.safeParse({ values: { user_version: 7 }, commitConfirmed: false })
    expect(ok.success).toBe(true)
    const unknown = schemaSchemas.setPragmas.safeParse({
      values: { writable_schema: 1 },
      commitConfirmed: true,
    })
    expect(unknown.success).toBe(false)
  })

  it('accepts column tracks with added and dropped columns', () => {
    const req = {
      original: { schema: 'main', name: 't' },
      schema: 'main',
      sql: 'CREATE TABLE t (b)',
      track: [
        ['a', null],
        [null, 'b'],
      ],
      commitConfirmed: false,
    }
    expect(schemaSchemas.saveTable.safeParse(req).success).toBe(true)
  })
})
