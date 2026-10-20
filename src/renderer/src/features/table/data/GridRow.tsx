import { memo } from 'react'
import { ruleColors, type CondFormat } from '@shared/format/condFormat'
import type { SqlValue } from '@shared/types/values'
import { cn } from '@/lib/cn'
import { displayCell, editText, type DisplayOptions } from './cellDisplay'
import { CellEditor } from './CellEditor'
import type { GridColumn } from './gridColumns'
import { isSelected, type CellPos, type Selection } from './selection'

interface GridRowProps {
  index: number
  rowNumber: number
  row: SqlValue[] | undefined
  columns: GridColumn[]
  template: string
  top: number
  height: number
  selection: Selection | null
  /** Column being edited in this row, and the text to start with (null = the current value). */
  editing: { col: number; initial: string | null } | null
  display: DisplayOptions
  onCellPointerDown: (pos: CellPos, e: React.PointerEvent) => void
  onCellPointerEnter: (pos: CellPos, e: React.PointerEvent) => void
  onCellDoubleClick: (pos: CellPos) => void
  onRowNumberClick: (row: number, e: React.MouseEvent) => void
  onRowNumberDoubleClick: (row: number) => void
  onCommit: (pos: CellPos, text: string, move: 'down' | 'right' | 'none') => void
  onCancelEdit: () => void
}

/** The conditional format rule that matched this cell, if any. */
function matchedRule(c: GridColumn, row: SqlValue[]): CondFormat | undefined {
  if (!c.condFormat) return undefined
  const match = row[c.condFormat.dataIndex]
  return match === null || match === undefined ? undefined : c.condFormat.rules[Number(match)]
}

const KIND_CLASS = {
  null: 'italic text-muted-foreground',
  blob: 'italic text-muted-foreground',
  number: 'justify-end text-right tabular-nums',
  text: '',
} as const

/** One grid row: sticky row number + cells. Memoised; re-renders only when its inputs change. */
export const GridRow = memo(function GridRow({
  index,
  rowNumber,
  row,
  columns,
  template,
  top,
  height,
  selection,
  editing,
  display,
  onCellPointerDown,
  onCellPointerEnter,
  onCellDoubleClick,
  onRowNumberClick,
  onRowNumberDoubleClick,
  onCommit,
  onCancelEdit,
}: GridRowProps) {
  const rowSelected = selection?.kind === 'rows' && selection.rows.includes(index)
  return (
    <div
      role="row"
      aria-rowindex={rowNumber + 1}
      className="absolute left-0 grid w-max border-b border-border"
      style={{ top, height, gridTemplateColumns: template }}
    >
      <div
        role="rowheader"
        onClick={(e) => onRowNumberClick(index, e)}
        onDoubleClick={() => onRowNumberDoubleClick(index)}
        className={cn(
          'sticky left-0 z-10 flex cursor-default items-center justify-end border-r bg-background px-2 text-micro text-muted-foreground tabular-nums select-none hover:text-foreground',
          rowSelected && 'bg-signal-tint text-signal-ink',
        )}
        title="Click to select the row, double-click for details"
      >
        {rowNumber}
      </div>
      {columns.map((c, col) => {
        const value = row?.[c.dataIndex]
        const cell = row ? displayCell(value, display) : { text: '', kind: 'text' as const }
        const selected = isSelected(selection, index, col)
        const focused = selection?.focus.row === index && selection.focus.col === col
        const pos = { row: index, col }
        const rule = !selected && row ? matchedRule(c, row) : undefined
        return (
          <div
            key={c.name}
            role="gridcell"
            aria-selected={selected}
            data-focused={focused || undefined}
            onPointerDown={(e) => onCellPointerDown(pos, e)}
            onPointerEnter={(e) => onCellPointerEnter(pos, e)}
            onDoubleClick={() => onCellDoubleClick(pos)}
            className={cn(
              'relative flex min-w-0 items-center border-r border-border px-2 select-none',
              KIND_CLASS[cell.kind],
              c.numeric && cell.kind === 'text' && 'justify-end text-right',
              c.formatted && cell.kind !== 'null' && 'text-signal',
              selected && 'bg-signal-tint text-signal-ink',
              focused && 'outline-2 -outline-offset-2 outline-ring',
            )}
            style={rule && ruleColors(rule)}
          >
            {!row ? (
              <span className="h-2.5 w-2/3 animate-pulse rounded-xs bg-surface-2 motion-reduce:animate-none" />
            ) : (
              <span className="truncate">{cell.text}</span>
            )}
            {editing?.col === col && row && (
              <CellEditor
                initial={editing.initial ?? editText(value)}
                numeric={c.numeric}
                onCommit={(text, move) => onCommit(pos, text, move)}
                onCancel={onCancelEdit}
              />
            )}
          </div>
        )
      })}
    </div>
  )
})
