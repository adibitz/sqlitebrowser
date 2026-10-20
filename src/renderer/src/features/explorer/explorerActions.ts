import {
  ClipboardCopyIcon,
  Columns3Icon,
  FileCodeIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  ListOrderedIcon,
  type LucideIcon,
  PencilRulerIcon,
  RefreshCwIcon,
  TableIcon,
  TablePropertiesIcon,
  TerminalSquareIcon,
  Trash2Icon,
} from 'lucide-react'
import type { DroppableKind } from '@shared/ipc/schema'
import { refreshSchema } from '@/features/database/actions'
import { createIndex, dropObject, editTable } from '@/features/database/schemaActions'
import { exportData, importCsv } from '@/features/io/ioActions'
import { copyText } from '@/lib/clipboard'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'
import type { ExplorerNode } from './explorerModel'

export interface ExplorerAction {
  id: string
  label: string
  icon: LucideIcon
  variant?: 'destructive'
  run: () => void
}

const DROPPABLE: Partial<Record<ExplorerNode['kind'], DroppableKind>> = {
  table: 'table',
  virtual: 'table',
  view: 'view',
  index: 'index',
  trigger: 'trigger',
}

function quoteIdentifier(name: string): string {
  return '"' + name.replaceAll('"', '""') + '"'
}

function qualified(ref: { schema: string; name: string }): string {
  return ref.schema === 'main'
    ? quoteIdentifier(ref.name)
    : `${quoteIdentifier(ref.schema)}.${quoteIdentifier(ref.name)}`
}

function statement(sql: string): string {
  return sql.trim().replace(/;+$/, '') + ';'
}

/** What double-click / Enter does on a node. */
export function activateNode(node: ExplorerNode): void {
  const tabs = useTabsStore.getState()
  if (
    node.ref &&
    (node.kind === 'table' || node.kind === 'view' || node.kind === 'virtual' || node.kind === 'system')
  ) {
    tabs.openTable(node.ref)
  } else if (node.kind === 'column' && node.ref) {
    tabs.openTable(node.ref)
  } else if ((node.kind === 'index' || node.kind === 'trigger') && node.sql) {
    tabs.openSql({ text: statement(node.sql) + '\n' })
  }
}

/** Context-menu entries for a node, or for the empty area / a group when `node` is null. */
export function explorerActions(node: ExplorerNode | null): ExplorerAction[] {
  const tabs = useTabsStore.getState()
  const writable = !useDbStore.getState().state.readOnly
  if (!node || node.kind === 'group' || node.kind === 'schema') {
    const create: ExplorerAction[] = writable
      ? [
          {
            id: 'createTable',
            label: 'Create table…',
            icon: TablePropertiesIcon,
            run: () => void editTable(null),
          },
          { id: 'createIndex', label: 'Create index…', icon: ListOrderedIcon, run: () => createIndex(null) },
          { id: 'importCsv', label: 'Import CSV…', icon: FileSpreadsheetIcon, run: () => void importCsv() },
        ]
      : []
    return [
      ...create,
      { id: 'schema', label: 'Show database schema', icon: FileCodeIcon, run: () => tabs.openSchema(null) },
      { id: 'refresh', label: 'Refresh', icon: RefreshCwIcon, run: () => void refreshSchema() },
    ]
  }
  if (node.kind === 'column') {
    return [
      { id: 'open', label: 'Open table', icon: TableIcon, run: () => activateNode(node) },
      {
        id: 'copyColumn',
        label: 'Copy column name',
        icon: ClipboardCopyIcon,
        run: () => void copyText(quoteIdentifier(node.label), 'the column name'),
      },
    ]
  }
  const actions: ExplorerAction[] = []
  if (node.ref && node.kind !== 'index' && node.kind !== 'trigger') {
    const ref = node.ref
    actions.push(
      { id: 'browse', label: 'Browse data', icon: TableIcon, run: () => tabs.openTable(ref, 'data') },
      {
        id: 'structure',
        label: 'Show structure',
        icon: Columns3Icon,
        run: () => tabs.openTable(ref, 'structure'),
      },
      { id: 'schema', label: 'Show schema', icon: FileCodeIcon, run: () => tabs.openSchema(ref) },
      {
        id: 'select',
        label: 'New SELECT in SQL editor',
        icon: TerminalSquareIcon,
        run: () => tabs.openSql({ text: `SELECT * FROM ${qualified(ref)};\n` }),
      },
      { id: 'export', label: 'Export…', icon: FileDownIcon, run: () => exportData(null, ref) },
    )
    if (node.kind === 'table' && writable) {
      actions.push(
        { id: 'modify', label: 'Modify table…', icon: PencilRulerIcon, run: () => void editTable(ref) },
        { id: 'createIndex', label: 'Create index…', icon: ListOrderedIcon, run: () => createIndex(ref) },
      )
    }
  }
  actions.push({
    id: 'copyName',
    label: 'Copy name',
    icon: ClipboardCopyIcon,
    run: () => void copyText(node.label, 'the name'),
  })
  if (node.sql) {
    const sql = node.sql
    actions.push({
      id: 'copySql',
      label: 'Copy CREATE statement',
      icon: ClipboardCopyIcon,
      run: () => void copyText(statement(sql), 'the CREATE statement'),
    })
  }
  const dropKind = DROPPABLE[node.kind]
  if (dropKind && node.ref && writable) {
    const ref = node.ref
    actions.push({
      id: 'drop',
      label: `Delete ${dropKind}…`,
      icon: Trash2Icon,
      variant: 'destructive',
      run: () => void dropObject(dropKind, ref),
    })
  }
  return actions
}
