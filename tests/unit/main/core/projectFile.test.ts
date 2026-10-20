// Port of the path rules of reference/tests/test_project.py (relative database paths, atomic save).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadProject, resolveDbPath, saveProject, storedDbPath } from '../../../../src/main/core/projectFile'
import { emptyProject, projectFromXml, ProjectError } from '@shared/project/sqbpro'
import { tempDir } from '../../../fixtures/tempDir'

describe('project files on disk', () => {
  it('stores a database next to the project by name and resolves it back', () => {
    const dir = tempDir()
    const project = join(dir, 'work.sqbpro')
    const db = join(dir, 'demo.db')
    writeFileSync(db, '')
    saveProject(project, {
      ...emptyProject(),
      dbPath: db,
      attached: [['extra', join(dir, 'extra.db')]],
    })
    expect(existsSync(project + '.tmp')).toBe(false)
    expect(projectFromXml(readFileSync(project, 'utf8')).dbPath).toBe('demo.db')
    const back = loadProject(project)
    expect(back.dbPath).toBe(db)
    expect(back.attached).toEqual([['extra', join(dir, 'extra.db')]])
  })

  it('keeps the absolute path of a database in another folder', () => {
    const dir = tempDir()
    const other = join(dir, 'data')
    mkdirSync(other)
    expect(storedDbPath(join(other, 'x.db'), join(dir, 'x.sqbpro'))).toBe(join(other, 'x.db'))
    expect(storedDbPath(':memory:', join(dir, 'x.sqbpro'))).toBe(':memory:')
    expect(resolveDbPath(':memory:', join(dir, 'x.sqbpro'))).toBe(':memory:')
  })

  it('reports files that are not projects', () => {
    const dir = tempDir()
    const bad = join(dir, 'bad.sqbpro')
    writeFileSync(bad, '<html/>')
    expect(() => loadProject(bad)).toThrow(ProjectError)
    expect(() => loadProject(join(dir, 'nope.sqbpro'))).toThrow(/ENOENT/)
  })
})
