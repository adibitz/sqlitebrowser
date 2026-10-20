// Port of reference/sqliteview/ui/explorer.py (SchemaExplorer.populate and the _Filter proxy).
// Pure: schema snapshot + filter text -> tree nodes, and tree -> visible rows.
import type { ColumnInfo, ObjectRef, SchemaInfo, TableInfo } from '@shared/types/schema'

export type ExplorerNodeKind =
  'schema' | 'group' | 'table' | 'view' | 'virtual' | 'system' | 'column' | 'index' | 'trigger'

export interface ExplorerNode {
  /** Stable path, e.g. "main/Tables/customers/email". */
  id: string
  kind: ExplorerNodeKind
  label: string
  /** Secondary text: column type, "on table", group count. */
  detail?: string
  /** The table/view (for columns: their table; for indices/triggers: themselves). */
  ref?: ObjectRef
  sql?: string
  column?: ColumnInfo
  children: ExplorerNode[]
}

export interface ExplorerRow {
  node: ExplorerNode
  depth: number
  expanded: boolean
  hasChildren: boolean
}

const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase())

function columnNode(parentId: string, table: TableInfo, c: ColumnInfo): ExplorerNode {
  return {
    id: `${parentId}/${c.name}`,
    kind: 'column',
    label: c.name,
    detail: c.type,
    ref: { schema: table.schema, name: table.name },
    column: c,
    children: [],
  }
}

function tableNode(parentId: string, t: TableInfo): ExplorerNode {
  const id = `${parentId}/${t.name}`
  return {
    id,
    kind: t.kind,
    label: t.name,
    ref: { schema: t.schema, name: t.name },
    sql: t.sql,
    children: t.kind === 'system' ? [] : t.columns.map((c) => columnNode(id, t, c)),
  }
}

function group(parentId: string, title: string, children: ExplorerNode[]): ExplorerNode {
  return {
    id: `${parentId}/${title}`,
    kind: 'group',
    label: title,
    detail: String(children.length),
    children,
  }
}

function hasVisibleObjects(s: SchemaInfo): boolean {
  if (s.name !== 'temp') return true
  return s.tables.some((t) => !t.name.startsWith('sqlite_')) || s.indices.length > 0 || s.triggers.length > 0
}

/** Schema → Tables / Views / Indices / Triggers / System groups. */
export function buildExplorerTree(schemata: SchemaInfo[]): ExplorerNode[] {
  const shown = schemata.filter(hasVisibleObjects)
  const multi = shown.length > 1
  const roots: ExplorerNode[] = []
  for (const s of shown) {
    const base = s.name
    const tables = s.tables.filter((t) => t.kind === 'table' || t.kind === 'virtual').sort(byName)
    const views = s.tables.filter((t) => t.kind === 'view').sort(byName)
    const system = s.tables.filter((t) => t.kind === 'system').sort(byName)
    const groups: ExplorerNode[] = [
      group(
        base,
        'Tables',
        tables.map((t) => tableNode(`${base}/Tables`, t)),
      ),
    ]
    if (views.length)
      groups.push(
        group(
          base,
          'Views',
          views.map((t) => tableNode(`${base}/Views`, t)),
        ),
      )
    if (s.indices.length) {
      groups.push(
        group(
          base,
          'Indices',
          [...s.indices].sort(byName).map((i) => ({
            id: `${base}/Indices/${i.name}`,
            kind: 'index' as const,
            label: i.name,
            detail: i.table,
            ref: { schema: s.name, name: i.table },
            sql: i.sql,
            children: [],
          })),
        ),
      )
    }
    if (s.triggers.length) {
      groups.push(
        group(
          base,
          'Triggers',
          [...s.triggers].sort(byName).map((t) => ({
            id: `${base}/Triggers/${t.name}`,
            kind: 'trigger' as const,
            label: t.name,
            detail: t.table,
            ref: { schema: s.name, name: t.table },
            sql: t.sql,
            children: [],
          })),
        ),
      )
    }
    if (system.length)
      groups.push(
        group(
          base,
          'System',
          system.map((t) => tableNode(`${base}/System`, t)),
        ),
      )
    if (multi) roots.push({ id: base, kind: 'schema', label: s.name, children: groups })
    else roots.push(...groups)
  }
  return roots
}

/** Keeps nodes whose name contains `text`, their ancestors, and columns of matching tables. */
export function filterTree(nodes: ExplorerNode[], text: string): ExplorerNode[] {
  const pattern = text.trim().toLowerCase()
  if (!pattern) return nodes
  const matches = (n: ExplorerNode): boolean => n.label.toLowerCase().includes(pattern)
  const visit = (n: ExplorerNode, parentMatched: boolean): ExplorerNode | null => {
    if (n.kind === 'column') return parentMatched || matches(n) ? n : null
    const selfMatched = n.kind !== 'group' && n.kind !== 'schema' && matches(n)
    const children = n.children.map((c) => visit(c, selfMatched)).filter((c): c is ExplorerNode => c !== null)
    if (selfMatched || children.length) return { ...n, children }
    return null
  }
  return nodes.map((n) => visit(n, false)).filter((n): n is ExplorerNode => n !== null)
}

/** Depth-first list of rows whose ancestors are all expanded. */
export function visibleRows(
  nodes: ExplorerNode[],
  expanded: ReadonlySet<string>,
  expandAll = false,
): ExplorerRow[] {
  const rows: ExplorerRow[] = []
  const walk = (list: ExplorerNode[], depth: number): void => {
    for (const node of list) {
      const hasChildren = node.children.length > 0
      const isExpanded = hasChildren && (expandAll || expanded.has(node.id))
      rows.push({ node, depth, expanded: isExpanded, hasChildren })
      if (isExpanded) walk(node.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return rows
}

/** Tables, views and summary counts for the footer ("3 tables · 1 view"). */
export function explorerSummary(schemata: SchemaInfo[]): string {
  let tables = 0
  let views = 0
  for (const s of schemata) {
    for (const t of s.tables) {
      if (t.kind === 'table' || t.kind === 'virtual') tables++
      else if (t.kind === 'view') views++
    }
  }
  return `${tables} table${tables === 1 ? '' : 's'} · ${views} view${views === 1 ? '' : 's'}`
}

/** Groups open by default: every schema and its Tables group. */
export function defaultExpanded(schemata: SchemaInfo[]): Set<string> {
  const ids = new Set<string>()
  for (const s of schemata) {
    ids.add(s.name)
    ids.add(`${s.name}/Tables`)
  }
  return ids
}
