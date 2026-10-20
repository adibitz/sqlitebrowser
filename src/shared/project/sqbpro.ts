// Port of reference/sqliteview/core/project.py (upstream MainWindow::saveProject / loadProject).
// The XML follows upstream so projects can be exchanged with DB Browser for SQLite: the database, its
// pragmas, attached databases, open table tabs with their browse settings, and SQL editors. This
// app's tab order is stored in an extra element placed where upstream's reader ignores it. Window
// geometry (Qt-specific in the Python app) isn't stored.
import { ObjectIdentifier } from '../sqlb/identifier'
import type { ObjectRef } from '../types/schema'
import { find, findAll, parseXml, writeXml, XmlError, type XmlElement } from './xmlLite'

export const PROJECT_EXTENSION = '.sqbpro'

/** Connection pragmas stored on the <db> element, in upstream's order. */
export const PROJECT_PRAGMAS = [
  'foreign_keys',
  'case_sensitive_like',
  'temp_store',
  'wal_autocheckpoint',
  'synchronous',
]

const UPSTREAM_TABS = 'structure browser pragmas query'
const UPSTREAM_TAB_INDEX: Record<string, number> = { table: 1, info: 2, sql: 3 }

export class ProjectError extends Error {}

/** Browse settings of one table or view; columns are field indices (0 = first column). */
export interface TableSettings {
  /** [field index, 0 ascending / 1 descending] */
  sort: [number, number][]
  /** field index -> filter text */
  filters: Record<number, string>
  globalFilters: string[]
  /** model column (0 = rowid, 1 = first field) -> width */
  columnWidths: Record<number, number>
  /** A view's key column; '_rowid_' means not editable. */
  unlockViewPk: string
}

/** One SQL editor: text kept in the project, or a reference to a .sql file. */
export interface SqlBuffer {
  name: string
  text: string
  filename: string
}

export type DocumentKind = 'table' | 'sql' | 'info'

/** A document tab; `index` points into `tables` or `sqlTabs`. */
export interface DocumentRef {
  kind: DocumentKind
  index: number
}

export interface Project {
  dbPath: string
  readOnly: boolean
  pragmas: Record<string, string>
  /** [schema, path] */
  attached: [string, string][]
  tables: ObjectRef[]
  tableSettings: { table: ObjectRef; settings: TableSettings }[]
  sqlTabs: SqlBuffer[]
  currentSqlTab: number
  /** Tab order; empty = tables, then SQL editors (upstream files). */
  documents: DocumentRef[]
  currentDocument: number
}

export function emptyTableSettings(): TableSettings {
  return { sort: [], filters: {}, globalFilters: [], columnWidths: {}, unlockViewPk: '_rowid_' }
}

export function emptyProject(): Project {
  return {
    dbPath: '',
    readOnly: false,
    pragmas: {},
    attached: [],
    tables: [],
    tableSettings: [],
    sqlTabs: [],
    currentSqlTab: 0,
    documents: [],
    currentDocument: -1,
  }
}

export function isProjectFile(path: string): boolean {
  return path.toLowerCase().endsWith(PROJECT_EXTENSION)
}

/** Appends .sqbpro unless the name already ends with it, as upstream does. */
export function projectFileName(path: string): string {
  return isProjectFile(path) ? path : path + PROJECT_EXTENSION
}

// ---------------------------------------------------------------------------- writing

const el = (
  tag: string,
  attrs: Record<string, string | number> = {},
  children: XmlElement[] = [],
  text = '',
): XmlElement => ({
  tag,
  attrs: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)])),
  children,
  text,
})

const displayName = (t: ObjectRef): string => (t.schema === 'main' ? t.name : `${t.schema}.${t.name}`)

function tableSettingsElement(table: ObjectRef, s: TableSettings): XmlElement {
  return el(
    'table',
    {
      schema: table.schema,
      name: table.name,
      show_row_id: 0,
      encoding: '',
      plot_x_axis: '',
      unlock_view_pk: s.unlockViewPk,
      freeze_columns: 0,
    },
    [
      el(
        'sort',
        {},
        s.sort.map(([index, mode]) => el('column', { index, mode })),
      ),
      el(
        'column_widths',
        {},
        Object.entries(s.columnWidths)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([index, value]) => el('column', { index, value })),
      ),
      el(
        'filter_values',
        {},
        Object.entries(s.filters)
          .filter(([, value]) => value)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([index, value]) => el('column', { index, value })),
      ),
      ...['conditional_formats', 'row_id_formats', 'display_formats', 'hidden_columns', 'plot_y_axes'].map(
        (t) => el(t),
      ),
      el(
        'global_filter',
        {},
        s.globalFilters.map((value) => el('filter', { value })),
      ),
    ],
  )
}

/** The project as XML. `dbPath` is written as given (the caller makes it relative). */
export function projectToXml(p: Project): string {
  const db = el('db', { path: p.dbPath, readonly: p.readOnly ? 1 : 0 })
  for (const name of PROJECT_PRAGMAS) if (name in p.pragmas) db.attrs[name] = p.pragmas[name]!
  const currentKind = p.documents[p.currentDocument]?.kind ?? ''
  const root = el('sqlb_project', {}, [
    db,
    el(
      'attached',
      {},
      p.attached.map(([schema, path]) => el('db', { schema, path })),
    ),
    el('window', {}, [
      el('main_tabs', { open: UPSTREAM_TABS, current: UPSTREAM_TAB_INDEX[currentKind] ?? 0 }),
      // This app's extension must come after <main_tabs>: upstream stops reading <window> at the first one.
      el(
        'documents',
        { current: p.currentDocument },
        p.documents.map((d) => el('document', { kind: d.kind, index: d.index })),
      ),
    ]),
    el('tab_browse', {}, [
      ...p.tables.map((t, i) =>
        el('table', {
          title: displayName(t),
          custom_title: 0,
          dock_id: i + 1,
          table: new ObjectIdentifier(t.schema, t.name).toSerialised(),
        }),
      ),
      el(
        'browse_table_settings',
        {},
        p.tableSettings.map((t) => tableSettingsElement(t.table, t.settings)),
      ),
    ]),
    el('tab_sql', {}, [
      ...p.sqlTabs.map((buf) =>
        buf.filename
          ? // The placeholder upstream writes for versions that don't know linked files.
            el(
              'sql',
              { name: buf.name, filename: buf.filename },
              [],
              `-- Reference to file "${buf.filename}" (not supported by this version) --`,
            )
          : el('sql', { name: buf.name }, [], buf.text),
      ),
      el('current_tab', { id: p.currentSqlTab }),
    ]),
  ])
  // No whitespace between elements: upstream's stream reader would see it as content and stop early.
  return '<?xml version="1.0" encoding="UTF-8"?>' + writeXml(root)
}

// ---------------------------------------------------------------------------- reading

function int(value: string | undefined, fallback = 0): number {
  return value !== undefined && /^-?\d+$/.test(value.trim()) ? Number(value) : fallback
}

function readTableSettings(e: XmlElement): TableSettings {
  const s = emptyTableSettings()
  s.unlockViewPk = e.attrs.unlock_view_pk || '_rowid_'
  for (const c of findAll(e, 'sort/column')) {
    const index = int(c.attrs.index, -1)
    if (index >= 0) s.sort.push([index, int(c.attrs.mode) ? 1 : 0])
  }
  for (const c of findAll(e, 'column_widths/column')) s.columnWidths[int(c.attrs.index)] = int(c.attrs.value)
  for (const c of findAll(e, 'filter_values/column')) {
    const index = int(c.attrs.index, -1)
    if (index >= 0 && c.attrs.value) s.filters[index] = c.attrs.value
  }
  s.globalFilters = findAll(e, 'global_filter/filter')
    .map((f) => f.attrs.value ?? '')
    .filter(Boolean)
  return s
}

/** `<current_table name>` of upstream 3.11 and older: serialised, or "schema.table" / "table". */
function oldTableName(name: string): ObjectRef {
  const id = ObjectIdentifier.fromSerialised(name)
  if (id) return { schema: id.schema, name: id.name }
  const dot = name.indexOf('.')
  return dot >= 0 ? { schema: name.slice(0, dot), name: name.slice(dot + 1) } : { schema: 'main', name }
}

/** Parses a project. Throws ProjectError if it isn't one. */
export function projectFromXml(text: string): Project {
  let root: XmlElement
  try {
    root = parseXml(text)
  } catch (err) {
    throw new ProjectError(`Invalid project file: ${err instanceof XmlError ? err.message : String(err)}`, {
      cause: err,
    })
  }
  if (root.tag !== 'sqlb_project') throw new ProjectError('This is not a DB Browser for SQLite project file.')

  const p = emptyProject()
  const db = find(root, 'db')
  if (db) {
    p.dbPath = db.attrs.path ?? ''
    p.readOnly = int(db.attrs.readonly) !== 0
    for (const name of PROJECT_PRAGMAS) if (db.attrs[name]) p.pragmas[name] = db.attrs[name]
  }
  p.attached = findAll(root, 'attached/db')
    .filter((a) => a.attrs.schema && a.attrs.path)
    .map((a) => [a.attrs.schema!, a.attrs.path!])

  const docs = find(root, 'window/documents')
  if (docs) {
    p.currentDocument = int(docs.attrs.current, -1)
    p.documents = findAll(docs, 'document')
      .map((d) => ({ kind: d.attrs.kind as DocumentKind, index: int(d.attrs.index) }))
      .filter((d) => d.kind === 'table' || d.kind === 'sql' || d.kind === 'info')
  }

  const browse = find(root, 'tab_browse')
  if (browse) {
    for (const t of findAll(browse, 'table')) {
      const id = ObjectIdentifier.fromSerialised(t.attrs.table ?? '')
      if (id && id.name) p.tables.push({ schema: id.schema, name: id.name })
    }
    const old = find(browse, 'current_table')
    if (old && !p.tables.length) {
      const t = oldTableName(old.attrs.name ?? '')
      if (t.name) p.tables.push(t)
    }
    p.tableSettings = findAll(browse, 'browse_table_settings/table').map((t) => ({
      table: { schema: t.attrs.schema || 'main', name: t.attrs.name ?? '' },
      settings: readTableSettings(t),
    }))
  }

  const sql = find(root, 'tab_sql')
  if (sql) {
    p.sqlTabs = findAll(sql, 'sql').map((e) => {
      const filename = e.attrs.filename ?? ''
      return { name: e.attrs.name ?? '', text: filename ? '' : e.text, filename }
    })
    const current = find(sql, 'current_tab')
    if (current) p.currentSqlTab = int(current.attrs.id)
  }
  return p
}

/** The browse settings stored for `table`, if any. */
export function settingsFor(p: Project, table: ObjectRef): TableSettings | undefined {
  return p.tableSettings.find((t) => t.table.schema === table.schema && t.table.name === table.name)?.settings
}
