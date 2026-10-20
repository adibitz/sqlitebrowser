import {
  Columns3Icon,
  DatabaseIcon,
  EyeIcon,
  FolderIcon,
  KeyRoundIcon,
  LinkIcon,
  ListOrderedIcon,
  LockIcon,
  type LucideIcon,
  SparklesIcon,
  TableIcon,
  ZapIcon,
} from 'lucide-react'
import type { ExplorerNode } from './explorerModel'

/** Icon for a tree node; columns show key / foreign key / plain. */
export function nodeIcon(node: ExplorerNode): LucideIcon {
  switch (node.kind) {
    case 'schema':
      return DatabaseIcon
    case 'group':
      return FolderIcon
    case 'table':
      return TableIcon
    case 'view':
      return EyeIcon
    case 'virtual':
      return SparklesIcon
    case 'system':
      return LockIcon
    case 'index':
      return ListOrderedIcon
    case 'trigger':
      return ZapIcon
    case 'column':
      if (node.column?.primaryKey) return KeyRoundIcon
      if (node.column?.foreignKey) return LinkIcon
      return Columns3Icon
  }
}
