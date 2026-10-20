// Port of MainWindow.open_project / _apply_project / _collect_project / save_project.
import { toast } from 'sonner'
import type { ProjectTabs } from '@shared/ipc/project'
import { settingsFor, type Project, type SqlBuffer } from '@shared/project/sqbpro'
import { MEMORY_DATABASE } from '@shared/types/db'
import { findTable } from '@shared/types/schema'
import { openDatabaseAt } from '@/features/database/actions'
import { fileName } from '@/features/database/fileName'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useProjectStore } from '@/store/project'
import { useTabsStore } from '@/store/tabs'
import { browseToSettings, settingsToBrowse } from './browseSettings'

/** The open tabs as a project stores them (schema tabs aren't stored, like upstream). */
export function collectTabs(): ProjectTabs {
  const { tabs, activeId } = useTabsStore.getState()
  const { schemata } = useDbStore.getState().state
  const p: ProjectTabs = {
    tables: [],
    tableSettings: [],
    sqlTabs: [],
    currentSqlTab: 0,
    documents: [],
    currentDocument: -1,
  }
  for (const tab of tabs) {
    if (tab.kind === 'table') {
      const columns = findTable(schemata, tab.object)?.columns.map((c) => c.name) ?? []
      p.documents.push({ kind: 'table', index: p.tables.length })
      p.tables.push(tab.object)
      p.tableSettings.push({ table: tab.object, settings: browseToSettings(tab.browse, columns) })
    } else if (tab.kind === 'sql') {
      if (tab.id === activeId) p.currentSqlTab = p.sqlTabs.length
      p.documents.push({ kind: 'sql', index: p.sqlTabs.length })
      p.sqlTabs.push({
        name: tab.path ? fileName(tab.path) : tab.name,
        text: tab.text,
        filename: tab.path ?? '',
      })
    } else if (tab.kind === 'info') {
      p.documents.push({ kind: 'info', index: 0 })
    } else continue
    if (tab.id === activeId) p.currentDocument = p.documents.length - 1
  }
  return p
}

async function applyPragmas(pragmas: Record<string, string>): Promise<void> {
  const info = await api.schema.info()
  const values = Object.fromEntries(
    Object.entries(pragmas).filter(([name, value]) => String(info.pragmas[name] ?? '') !== value),
  )
  if (Object.keys(values).length) await api.schema.setPragmas({ values, commitConfirmed: true })
}

async function attachAll(attached: [string, string][]): Promise<void> {
  const failed: string[] = []
  for (const [schema, path] of attached) {
    if (useDbStore.getState().state.schemata.some((s) => s.name === schema)) continue
    try {
      useDbStore.getState().setState(await api.db.attach({ path, name: schema }))
    } catch (err) {
      failed.push(`${schema}: ${errorMessage(err)}`)
    }
  }
  if (failed.length) toast.warning(`Could not attach ${failed.join('; ')}`)
}

async function openSqlBuffer(buf: SqlBuffer): Promise<string | null> {
  const tabs = useTabsStore.getState()
  if (!buf.filename) return tabs.openSql({ text: buf.text, name: buf.name || undefined, clean: true })
  try {
    const file = await api.files.openTextAt({ path: buf.filename })
    return tabs.openSql({ text: file.content, path: file.path, name: file.name })
  } catch (err) {
    toast.warning(`Couldn't open ${buf.filename}: ${errorMessage(err)}`)
    return null
  }
}

/** Restores the project's tabs; without any, the Database Info tab stays (port of _apply_project). */
async function restoreTabs(project: Project): Promise<void> {
  const docs = project.documents.length
    ? project.documents
    : [
        ...project.tables.map((_, index) => ({ kind: 'table' as const, index })),
        ...project.sqlTabs.map((_, index) => ({ kind: 'sql' as const, index })),
      ]
  if (!docs.length) return
  const tabs = useTabsStore.getState()
  for (const t of tabs.tabs) if (t.kind === 'info') tabs.close(t.id)
  const opened: (string | null)[] = []
  const sqlIds: (string | null)[] = []
  for (const d of docs) {
    let id: string | null = null
    if (d.kind === 'table') {
      const ref = project.tables[d.index]
      const info = ref && findTable(useDbStore.getState().state.schemata, ref)
      if (ref && info) {
        tabs.openTable(ref)
        id = useTabsStore.getState().activeId
        const settings = settingsFor(project, ref)
        if (id && settings) {
          tabs.updateBrowse(
            id,
            settingsToBrowse(
              settings,
              info.columns.map((c) => c.name),
            ),
          )
        }
      }
    } else if (d.kind === 'sql') {
      const buf = project.sqlTabs[d.index]
      if (buf) id = await openSqlBuffer(buf)
      sqlIds.push(id)
    } else {
      tabs.openInfo()
      id = useTabsStore.getState().activeId
    }
    opened.push(id)
  }
  // Upstream files have no tab order: show their current SQL editor, else the first tab.
  const current = project.documents.length ? opened[project.currentDocument] : sqlIds[project.currentSqlTab]
  const target = current ?? opened.find((id) => id !== null)
  if (target) tabs.activate(target)
}

/** Opens a .sqbpro file (asking for one without `path`); resolves true when it opened. */
export async function openProject(path?: string): Promise<boolean> {
  const file = await useDbStore
    .getState()
    .run('Reading the project', () => api.project.open({ path: path ?? null }))
  if (!file) return false
  const { project } = file
  if (!(await openDatabaseAt(project.dbPath, project.readOnly))) return false
  try {
    if (!project.readOnly) await applyPragmas(project.pragmas)
  } catch (err) {
    toast.warning(`Couldn't set the project's pragmas: ${errorMessage(err)}`)
  }
  await attachAll(project.attached)
  await restoreTabs(project)
  useProjectStore.getState().setPath(file.path)
  void useDbStore.getState().refreshRecent()
  toast.success(`Opened project ${fileName(file.path)}`)
  return true
}

/** Saves the workspace to its project file, or asks where (`saveAs`, or no project yet). */
export async function saveProject(saveAs = false): Promise<void> {
  const { state } = useDbStore.getState()
  if (!state.isOpen) return
  const current = useProjectStore.getState().path
  const defaultName =
    current ??
    (state.path === MEMORY_DATABASE ? 'project.sqbpro' : state.path.replace(/\.[^.\\/]*$/, '') + '.sqbpro')
  const path = await useDbStore
    .getState()
    .run('Saving the project', () =>
      api.project.save({ path: saveAs ? null : current, defaultName, tabs: collectTabs() }),
    )
  if (!path) return
  useProjectStore.getState().setPath(path)
  void useDbStore.getState().refreshRecent()
  toast.success(`Project saved to ${fileName(path)}`)
}
