import { useState, type KeyboardEvent } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { closeTab } from '@/features/sql/sqlFiles'
import { cn } from '@/lib/cn'
import { useTabsStore } from '@/store/tabs'
import { tabIcon, tabTitle } from './tabTitle'

/** Document tab strip: activate, close (button or middle click), reorder by dragging, arrow keys. */
export function DocumentTabs() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)
  const { activate, move, openSql } = useTabsStore.getState()
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const onKeyDown = (e: KeyboardEvent, index: number): void => {
    const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : null
    if (next === null) return
    const target = tabs[(next + tabs.length) % tabs.length]
    if (!target) return
    e.preventDefault()
    activate(target.id)
    document.getElementById(`doc-tab-${target.id}`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Open documents"
      className="flex h-9 shrink-0 items-end overflow-x-auto border-b"
    >
      {tabs.map((tab, i) => {
        const Icon = tabIcon(tab)
        const active = tab.id === activeId
        const title = tabTitle(tab)
        return (
          <div
            key={tab.id}
            id={`doc-tab-${tab.id}`}
            role="tab"
            aria-selected={active}
            aria-controls={`doc-panel-${tab.id}`}
            aria-labelledby={`doc-tab-title-${tab.id}`}
            tabIndex={active ? 0 : -1}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
            }}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) move(dragIndex, i)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
            onClick={() => activate(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) void closeTab(tab.id)
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
            title={title}
            className={cn(
              'group/tab relative flex h-9 max-w-56 shrink-0 cursor-default items-center gap-2 border-r pr-1 pl-3 text-body-sm outline-none select-none',
              'transition-[color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              active
                ? 'bg-card text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span id={`doc-tab-title-${tab.id}`} className="truncate">
              {title}
            </span>
            <button
              type="button"
              aria-label={`Close ${title}`}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                void closeTab(tab.id)
              }}
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:bg-surface-3 hover:text-foreground',
                active ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100',
              )}
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )
      })}
      <TooltipIconButton
        label="New SQL editor (Ctrl+T)"
        className="mx-1 self-center"
        onClick={() => openSql()}
      >
        <PlusIcon />
      </TooltipIconButton>
    </div>
  )
}
