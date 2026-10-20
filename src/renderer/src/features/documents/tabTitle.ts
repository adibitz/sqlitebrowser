import { FileCodeIcon, InfoIcon, type LucideIcon, TableIcon, TerminalSquareIcon } from 'lucide-react'
import { objectDisplayName } from '@shared/types/schema'
import { isSqlModified, type DocTab } from '@/store/tabs'

export function tabTitle(tab: DocTab): string {
  if (tab.kind === 'table') return objectDisplayName(tab.object)
  if (tab.kind === 'sql') return tab.name + (isSqlModified(tab) ? ' •' : '')
  if (tab.kind === 'info') return 'Database info'
  return tab.object ? `Schema: ${objectDisplayName(tab.object)}` : 'Schema'
}

export function tabIcon(tab: DocTab): LucideIcon {
  if (tab.kind === 'table') return TableIcon
  if (tab.kind === 'sql') return TerminalSquareIcon
  if (tab.kind === 'info') return InfoIcon
  return FileCodeIcon
}
