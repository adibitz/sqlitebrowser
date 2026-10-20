import { useMemo, useState } from 'react'
import { FileCodeIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { refreshSchema } from '@/features/database/actions'
import { useDbStore } from '@/store/db'
import { useSetting } from '@/store/settings'
import { useTabsStore } from '@/store/tabs'
import { activateNode, explorerActions } from './explorerActions'
import {
  buildExplorerTree,
  defaultExpanded,
  explorerSummary,
  filterTree,
  visibleRows,
  type ExplorerNode,
} from './explorerModel'
import { ExplorerTree } from './ExplorerTree'

/** Schema sidebar (port of reference/sqliteview/ui/explorer.py). */
export function Explorer() {
  const schemata = useDbStore((s) => s.state.schemata)
  const compact = useSetting('General/uiDensity') === 'compact'
  const [filter, setFilter] = useState('')
  // Explicit open/closed choices; anything not chosen follows defaultExpanded (so new schemas open too).
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [menuNode, setMenuNode] = useState<ExplorerNode | null>(null)

  const tree = useMemo(() => filterTree(buildExplorerTree(schemata), filter), [schemata, filter])
  const expanded = useMemo(() => {
    const ids = defaultExpanded(schemata)
    for (const [id, open] of overrides) {
      if (open) ids.add(id)
      else ids.delete(id)
    }
    return ids
  }, [schemata, overrides])
  const rows = useMemo(() => visibleRows(tree, expanded, filter.trim() !== ''), [tree, expanded, filter])

  const toggle = (id: string, open?: boolean): void => {
    setOverrides((prev) => new Map(prev).set(id, open ?? !expanded.has(id)))
  }

  return (
    <aside className="flex h-full flex-col bg-background" aria-label="Explorer">
      <div className="flex items-center gap-1 p-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter objects"
            aria-label="Filter objects"
            className="h-8 pl-8"
          />
        </div>
        <TooltipIconButton label="Database schema" onClick={() => useTabsStore.getState().openSchema(null)}>
          <FileCodeIcon />
        </TooltipIconButton>
        <TooltipIconButton label="Refresh schema" onClick={() => void refreshSchema()}>
          <RefreshCwIcon />
        </TooltipIconButton>
      </div>
      <ContextMenu>
        <ContextMenuTrigger className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {rows.length ? (
              <ExplorerTree
                rows={rows}
                focusedId={focusedId}
                compact={compact}
                onFocus={setFocusedId}
                onToggle={toggle}
                onActivate={activateNode}
                onContextNode={setMenuNode}
              />
            ) : (
              <p className="px-4 py-6 text-center text-muted-foreground">
                {filter ? `Nothing matches “${filter}”.` : 'This database has no tables yet.'}
              </p>
            )}
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {explorerActions(menuNode).map((action) => {
            const Icon = action.icon
            return (
              <ContextMenuItem key={action.id} variant={action.variant} onClick={action.run}>
                <Icon />
                {action.label}
              </ContextMenuItem>
            )
          })}
        </ContextMenuContent>
      </ContextMenu>
      <p className="border-t px-3 py-1.5 text-micro text-muted-foreground tabular-nums">
        {explorerSummary(schemata)}
      </p>
    </aside>
  )
}
