import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'

const created: string[] = []

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A fresh folder removed after the current test. */
export function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sqliteview-test-'))
  created.push(dir)
  return dir
}
