import { useRef } from 'react'
import {
  ArrowDownNarrowWideIcon,
  ArrowUpNarrowWideIcon,
  ChevronDownIcon,
  CodeXmlIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LinkIcon,
  ListPlusIcon,
  MoveHorizontalIcon,
  PaletteIcon,
  XIcon,
} from 'lucide-react'
import type { SortSpec } from '@shared/types/rows'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import { MIN_COLUMN_WIDTH, setSort, sortIndicator, toggleSort, type GridColumn } from './gridColumns'

interface HeaderCellProps {
  column: GridColumn
  sort: SortSpec[]
  /** null: no sorting and no column menu (SQL results). */
  onSort: ((sort: SortSpec[]) => void) | null
  onHide: () => void
  onShowAll: (() => void) | null
  onResize: (width: number | null) => void
  /** Opens the display or conditional format dialog; null hides those entries (SQL results). */
  onFormat: ((kind: 'display' | 'conditional') => void) | null
}

function describeColumn(c: GridColumn): string {
  const parts = [c.name, c.info.type || '(no type)']
  if (c.info.primaryKey) parts.push('PRIMARY KEY')
  if (c.info.notNull) parts.push('NOT NULL')
  if (c.info.unique) parts.push('UNIQUE')
  if (c.info.defaultValue) parts.push(`DEFAULT ${c.info.defaultValue}`)
  if (c.info.foreignKey) parts.push(`→ ${c.info.foreignKey}`)
  return parts.join('\n')
}

/** Column header: click sorts (Shift adds a sort column), menu, drag the edge to resize. */
export function HeaderCell({ column, sort, onSort, onHide, onShowAll, onResize, onFormat }: HeaderCellProps) {
  const indicator = sortIndicator(sort, column.name)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const sorted = sort.some((s) => s.column === column.name)

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    startX.current = e.clientX
    startWidth.current = column.width
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>): void => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    onResize(Math.max(MIN_COLUMN_WIDTH, startWidth.current + e.clientX - startX.current))
  }

  return (
    <div
      role="columnheader"
      aria-sort={
        !sorted
          ? 'none'
          : sort.find((s) => s.column === column.name)!.direction === 'asc'
            ? 'ascending'
            : 'descending'
      }
      title={describeColumn(column)}
      className="group/header relative flex h-full min-w-0 items-center border-r"
    >
      <button
        type="button"
        onClick={(e) => onSort?.(toggleSort(sort, column.name, e.shiftKey))}
        disabled={!onSort}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-label font-medium outline-none focus-visible:bg-surface-2 enabled:hover:bg-surface-2',
          column.numeric && 'justify-end',
        )}
      >
        {column.info.primaryKey && (
          <KeyRoundIcon className="size-3.5 shrink-0 text-warning" aria-label="Primary key" />
        )}
        {column.info.foreignKey && (
          <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Foreign key" />
        )}
        <span className={cn('truncate', column.info.foreignKey && 'italic')}>{column.name}</span>
        {indicator && <span className="shrink-0 text-micro text-signal tabular-nums">{indicator}</span>}
      </button>
      {onSort && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${column.name} column menu`}
            className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:opacity-100"
          >
            <ChevronDownIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onSort?.(setSort(sort, column.name, 'asc', false))}>
              <ArrowUpNarrowWideIcon />
              Sort ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort?.(setSort(sort, column.name, 'desc', false))}>
              <ArrowDownNarrowWideIcon />
              Sort descending
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!sort.length || (sort.length === 1 && sorted)}
              onClick={() => onSort?.(setSort(sort, column.name, 'asc', true))}
            >
              <ListPlusIcon />
              Then sort by this column
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!sort.length} onClick={() => onSort?.([])}>
              <XIcon />
              Clear sorting
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onFormat && (
              <>
                <DropdownMenuItem onClick={() => onFormat('display')}>
                  <CodeXmlIcon />
                  Display format…
                  {column.formatted && <span className="ml-auto text-micro text-signal">On</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('conditional')}>
                  <PaletteIcon />
                  Conditional formats…
                  {column.condFormat && (
                    <span className="ml-auto text-micro text-signal">{column.condFormat.rules.length}</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onHide}>
              <EyeOffIcon />
              Hide column
            </DropdownMenuItem>
            {onShowAll && (
              <DropdownMenuItem onClick={onShowAll}>
                <EyeOffIcon />
                Show all columns
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onResize(null)}>
              <MoveHorizontalIcon />
              Reset width
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${column.name}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onDoubleClick={() => onResize(null)}
        className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-ring/40"
      />
    </div>
  )
}
