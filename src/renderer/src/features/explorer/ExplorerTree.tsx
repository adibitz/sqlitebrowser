import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ExplorerNode, ExplorerRow } from './explorerModel'
import { nodeIcon } from './nodeIcon'

interface ExplorerTreeProps {
  rows: ExplorerRow[]
  focusedId: string | null
  compact: boolean
  onFocus: (id: string) => void
  onToggle: (id: string, open?: boolean) => void
  onActivate: (node: ExplorerNode) => void
  onContextNode: (node: ExplorerNode | null) => void
}

/** Accessible tree (role=tree, roving tabindex, arrow keys) of the explorer rows. */
export function ExplorerTree({
  rows,
  focusedId,
  compact,
  onFocus,
  onToggle,
  onActivate,
  onContextNode,
}: ExplorerTreeProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const focusedIndex = Math.max(
    0,
    rows.findIndex((r) => r.node.id === focusedId),
  )

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-focused="true"]')
    if (el && listRef.current?.contains(document.activeElement)) el.focus()
  }, [focusedId])

  const move = (index: number): void => {
    const row = rows[Math.min(rows.length - 1, Math.max(0, index))]
    if (row) onFocus(row.node.id)
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    const row = rows[focusedIndex]
    if (!row) return
    switch (e.key) {
      case 'ArrowDown':
        move(focusedIndex + 1)
        break
      case 'ArrowUp':
        move(focusedIndex - 1)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(rows.length - 1)
        break
      case 'ArrowRight':
        if (row.hasChildren && !row.expanded) onToggle(row.node.id, true)
        else if (row.expanded) move(focusedIndex + 1)
        break
      case 'ArrowLeft':
        if (row.expanded) onToggle(row.node.id, false)
        else {
          const parent = rows.slice(0, focusedIndex).findLast((r) => r.depth < row.depth)
          if (parent) onFocus(parent.node.id)
        }
        break
      case 'Enter':
        if (row.hasChildren && (row.node.kind === 'group' || row.node.kind === 'schema'))
          onToggle(row.node.id)
        else onActivate(row.node)
        break
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div
      ref={listRef}
      role="tree"
      aria-label="Database objects"
      className="flex flex-col py-1 outline-none"
      onKeyDown={onKeyDown}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) onContextNode(null)
      }}
    >
      {rows.map((row, i) => {
        const { node } = row
        const Icon = nodeIcon(node)
        const isFocused = i === focusedIndex
        return (
          <div
            key={node.id}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-expanded={row.hasChildren ? row.expanded : undefined}
            aria-selected={isFocused}
            tabIndex={isFocused ? 0 : -1}
            data-focused={isFocused}
            title={node.sql || undefined}
            className={cn(
              'group/row mx-1 flex cursor-default items-center gap-1.5 rounded-control pr-2 outline-none select-none',
              compact ? 'h-6' : 'h-7',
              'hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring',
              isFocused && 'bg-surface-2',
            )}
            style={{ paddingLeft: `${row.depth * 14 + 4}px` }}
            onClick={() => {
              onFocus(node.id)
              if (row.hasChildren && (node.kind === 'group' || node.kind === 'schema')) onToggle(node.id)
            }}
            onDoubleClick={() => {
              if (node.kind !== 'group' && node.kind !== 'schema') onActivate(node)
            }}
            onContextMenu={() => {
              onFocus(node.id)
              onContextNode(node)
            }}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-4 shrink-0 items-center justify-center',
                !row.hasChildren && 'invisible',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onToggle(node.id)
              }}
            >
              <ChevronRightIcon
                className={cn(
                  'size-3.5 text-muted-foreground transition-transform duration-150 ease-out-expo',
                  row.expanded && 'rotate-90',
                )}
              />
            </span>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn('truncate', node.kind === 'group' && 'font-medium')}>{node.label}</span>
            {node.detail && (
              <span className="ml-auto truncate pl-2 text-micro text-muted-foreground tabular-nums">
                {node.detail}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
