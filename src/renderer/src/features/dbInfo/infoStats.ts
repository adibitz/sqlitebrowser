// The stat cards of reference/sqliteview/ui/db_info_tab.py (DbInfoTab.reload).
import type { DatabaseInfo } from '@shared/ipc/schema'
import { humanReadableSize } from '@shared/format/data'
import type { DbState } from '@shared/types/db'

export interface InfoStat {
  title: string
  value: string
}

const count = (n: number): string => n.toLocaleString('en-US')

export function infoStats(info: DatabaseInfo, state: DbState, sqliteVersion: string): InfoStat[] {
  const main = state.schemata.find((s) => s.name === 'main')
  const tables = main?.tables.filter((t) => t.kind === 'table' || t.kind === 'virtual').length ?? 0
  const views = main?.tables.filter((t) => t.kind === 'view').length ?? 0
  return [
    { title: 'File size', value: info.fileSize ? humanReadableSize(info.fileSize) : '—' },
    { title: 'SQLite', value: sqliteVersion || '—' },
    { title: 'Encoding', value: state.encoding || '—' },
    { title: 'Tables / views', value: `${tables} / ${views}` },
    { title: 'Pages', value: `${count(info.pageCount)} × ${count(info.pageSize)} B` },
    { title: 'Free pages', value: count(info.freePages) },
    { title: 'Indices', value: String(main?.indices.length ?? 0) },
    { title: 'Mode', value: state.readOnly ? 'Read-only' : 'Read / write' },
  ]
}

/** "auto_vacuum" → "Auto vacuum". */
export function pragmaLabel(name: string): string {
  const words = name.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
