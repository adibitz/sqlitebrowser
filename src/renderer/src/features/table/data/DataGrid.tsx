import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { SortSpec } from '@shared/types/rows'
import type { DisplayOptions } from './cellDisplay'
import { FilterCell } from './FilterCell'
import { gutterWidth, type GridColumn } from './gridColumns'
import { GridRow } from './GridRow'
import { HeaderCell } from './HeaderCell'
import type { RowCache } from './rowCache'
import {
  cellSelection,
  clickRow,
  extendSelection,
  moveFocus,
  selectAll,
  type CellPos,
  type Selection,
} from './selection'

export interface EditingCell {
  pos: CellPos
  /** Text to start with; null edits the current value. */
  initial: string | null
}

export interface DataGridProps {
  columns: GridColumn[]
  /** Rows in view (the page, or every row). */
  rowCount: number
  /** Absolute index of view row 0 in the query result. */
  rowOffset: number
  cache: RowCache
  display: DisplayOptions
  rowHeight: number
  filters: Record<string, string>
  filterDelay: number
  filterEscape: string
  sort: SortSpec[]
  selection: Selection | null
  editing: EditingCell | null
  hiddenCount: number
  canEdit: (pos: CellPos) => boolean
  onFilter: (column: string, text: string) => void
  onSort: (sort: SortSpec[]) => void
  onHideColumn: (column: string) => void
  onShowAllColumns: () => void
  onResizeColumn: (column: string, width: number | null) => void
  /** Opens a column's display or conditional format dialog (table tabs only). */
  onFormatColumn?: (column: string, kind: 'display' | 'conditional') => void
  onSelect: (selection: Selection | null) => void
  onEdit: (editing: EditingCell | null) => void
  onCommit: (pos: CellPos, text: string) => void
  onOpenRecord: (row: number) => void
  onDeleteRows: () => void
  onCopy: () => void
  onSetNull: () => void
  /** Show the filter row (off for SQL results). */
  showFilterRow?: boolean
  /** Sort on header click and offer the column menu (off for SQL results). */
  columnMenus?: boolean
}

const HEADER_HEIGHT = 32
const FILTER_HEIGHT = 32

/** Virtualised data grid with header, filter row, selection, keyboard navigation and inline editing. */
export function DataGrid(props: DataGridProps) {
  const { columns, rowCount, rowOffset, cache, rowHeight, selection, editing, onSelect, onEdit } = props
  const showFilterRow = props.showFilterRow ?? true
  const columnMenus = props.columnMenus ?? true
  const headerHeight = HEADER_HEIGHT + (showFilterRow ? FILTER_HEIGHT : 0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const gutter = gutterWidth(rowOffset + rowCount)
  const template = `${gutter}px ${columns.map((c) => `${c.width}px`).join(' ')}`
  const totalWidth = gutter + columns.reduce((w, c) => w + c.width, 0)

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual; the React Compiler isn't used
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    paddingStart: headerHeight,
    scrollPaddingStart: headerHeight,
  })
  const items = virtualizer.getVirtualItems()
  const first = items[0]?.index ?? 0
  const last = items.at(-1)?.index ?? -1

  useEffect(() => {
    if (last >= first) cache.ensure(rowOffset + first, rowOffset + last + 1)
  }, [cache, rowOffset, first, last])

  useEffect(() => {
    const stop = (): void => {
      dragging.current = false
    }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const focusRow = selection?.focus.row
  useEffect(() => {
    if (focusRow !== undefined) virtualizer.scrollToIndex(focusRow, { align: 'auto' })
  }, [focusRow, virtualizer])

  const startEdit = useCallback(
    (pos: CellPos, initial: string | null = null) => {
      if (props.canEdit(pos)) onEdit({ pos, initial })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- canEdit identity changes with every render
    [onEdit, props.canEdit],
  )

  const onCellPointerDown = useCallback(
    (pos: CellPos, e: React.PointerEvent) => {
      if (e.button !== 0) return
      scrollRef.current?.focus({ preventScroll: true })
      dragging.current = true
      onSelect(e.shiftKey && selection ? extendSelection(selection, pos) : cellSelection(pos))
    },
    [onSelect, selection],
  )
  const onCellPointerEnter = useCallback(
    (pos: CellPos) => {
      if (dragging.current && selection) onSelect(extendSelection(selection, pos))
    },
    [onSelect, selection],
  )
  const onRowNumberClick = useCallback(
    (row: number, e: React.MouseEvent) => {
      scrollRef.current?.focus({ preventScroll: true })
      onSelect(clickRow(selection, row, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey }))
    },
    [onSelect, selection],
  )
  const onCommitCell = useCallback(
    (pos: CellPos, text: string, move: 'down' | 'right' | 'none') => {
      props.onCommit(pos, text)
      onEdit(null)
      if (move !== 'none')
        onSelect(
          moveFocus(
            cellSelection(pos),
            move === 'down' ? 1 : 0,
            move === 'right' ? 1 : 0,
            rowCount,
            columns.length,
            false,
          ),
        )
      scrollRef.current?.focus({ preventScroll: true })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCommit identity changes with every render
    [props.onCommit, onEdit, onSelect, rowCount, columns.length],
  )
  const onCancelEdit = useCallback(() => {
    onEdit(null)
    scrollRef.current?.focus({ preventScroll: true })
  }, [onEdit])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (editing) return
    const mod = e.ctrlKey || e.metaKey
    const page = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 400) / rowHeight) - 3)
    const moves: Record<string, [number, number]> = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      PageDown: [page, 0],
      PageUp: [-page, 0],
      Home: mod ? [-rowCount, -columns.length] : [0, -columns.length],
      End: mod ? [rowCount, columns.length] : [0, columns.length],
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      onSelect(moveFocus(selection, move[0], move[1], rowCount, columns.length, e.shiftKey))
      return
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      onSelect(selectAll(rowCount, columns.length))
    } else if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      props.onCopy()
    } else if ((e.key === 'Enter' || e.key === 'F2') && selection) {
      e.preventDefault()
      startEdit(selection.focus)
    } else if (e.key === 'Delete' && selection) {
      e.preventDefault()
      if (selection.kind === 'rows') props.onDeleteRows()
      else props.onSetNull()
    } else if (e.key === 'Escape') {
      onSelect(null)
    } else if (selection && e.key.length === 1 && !mod && !e.altKey) {
      e.preventDefault()
      startEdit(selection.focus, e.key)
    }
  }

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-rowcount={rowCount + 1}
      aria-colcount={columns.length + 1}
      aria-multiselectable
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative h-full overflow-auto bg-card text-body-sm outline-none"
    >
      <div style={{ height: virtualizer.getTotalSize(), width: totalWidth }} className="relative">
        <div className="sticky top-0 z-20 w-max bg-background" style={{ gridTemplateColumns: template }}>
          <div
            role="row"
            className="grid border-b"
            style={{ gridTemplateColumns: template, height: HEADER_HEIGHT }}
          >
            <div className="sticky left-0 z-10 flex items-center border-r bg-background px-2 text-micro text-muted-foreground">
              {props.hiddenCount > 0 && (
                <span title={`${props.hiddenCount} hidden`}>+{props.hiddenCount}</span>
              )}
            </div>
            {columns.map((c) => (
              <HeaderCell
                key={c.name}
                column={c}
                sort={props.sort}
                onSort={columnMenus ? props.onSort : null}
                onHide={() => props.onHideColumn(c.name)}
                onShowAll={props.hiddenCount ? props.onShowAllColumns : null}
                onResize={(w) => props.onResizeColumn(c.name, w)}
                onFormat={
                  columnMenus && props.onFormatColumn ? (kind) => props.onFormatColumn?.(c.name, kind) : null
                }
              />
            ))}
          </div>
          {showFilterRow && (
            <div
              className="grid border-b bg-background"
              style={{ gridTemplateColumns: template, height: FILTER_HEIGHT }}
            >
              <div className="sticky left-0 z-10 border-r bg-background" />
              {columns.map((c) => (
                <FilterCell
                  key={c.name}
                  column={c.name}
                  value={props.filters[c.name] ?? ''}
                  delay={props.filterDelay}
                  escape={props.filterEscape}
                  onChange={(text) => props.onFilter(c.name, text)}
                />
              ))}
            </div>
          )}
        </div>
        {items.map((item) => (
          <GridRow
            key={item.key}
            index={item.index}
            rowNumber={rowOffset + item.index + 1}
            row={cache.rowAt(rowOffset + item.index)}
            columns={columns}
            template={template}
            top={item.start}
            height={item.size}
            selection={selection}
            editing={
              editing?.pos.row === item.index ? { col: editing.pos.col, initial: editing.initial } : null
            }
            display={props.display}
            onCellPointerDown={onCellPointerDown}
            onCellPointerEnter={onCellPointerEnter}
            onCellDoubleClick={startEdit}
            onRowNumberClick={onRowNumberClick}
            onRowNumberDoubleClick={props.onOpenRecord}
            onCommit={onCommitCell}
            onCancelEdit={onCancelEdit}
          />
        ))}
      </div>
    </div>
  )
}
