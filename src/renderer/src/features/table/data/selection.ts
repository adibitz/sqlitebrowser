// Selection model of the data grid: a rectangle of cells, or a set of whole rows.
// Rows are view indices (within the page); columns are indices into the visible columns.

export interface CellPos {
  row: number
  col: number
}

export type Selection =
  | { kind: 'cells'; anchor: CellPos; focus: CellPos }
  | { kind: 'rows'; rows: number[]; anchor: number; focus: CellPos }

export interface Rect {
  top: number
  bottom: number
  left: number
  right: number
}

export function cellSelection(pos: CellPos): Selection {
  return { kind: 'cells', anchor: pos, focus: pos }
}

export function extendSelection(sel: Selection, to: CellPos): Selection {
  if (sel.kind === 'rows') return rowsBetween(sel.anchor, to.row, to.col)
  return { kind: 'cells', anchor: sel.anchor, focus: to }
}

function rowsBetween(anchor: number, to: number, col: number): Selection {
  const [a, b] = anchor <= to ? [anchor, to] : [to, anchor]
  return {
    kind: 'rows',
    rows: Array.from({ length: b - a + 1 }, (_, i) => a + i),
    anchor,
    focus: { row: to, col },
  }
}

/** Click on a row number: select it; Ctrl toggles it; Shift extends from the anchor. */
export function clickRow(
  sel: Selection | null,
  row: number,
  mod: { ctrl: boolean; shift: boolean },
): Selection {
  const col = sel?.focus.col ?? 0
  if (mod.shift && sel) {
    const anchor = sel.kind === 'rows' ? sel.anchor : sel.anchor.row
    return rowsBetween(anchor, row, col)
  }
  if (mod.ctrl && sel?.kind === 'rows') {
    const rows = sel.rows.includes(row)
      ? sel.rows.filter((r) => r !== row)
      : [...sel.rows, row].sort((a, b) => a - b)
    return { kind: 'rows', rows, anchor: row, focus: { row, col } }
  }
  return { kind: 'rows', rows: [row], anchor: row, focus: { row, col } }
}

export function selectAll(rowCount: number, colCount: number): Selection | null {
  if (!rowCount || !colCount) return null
  return { kind: 'cells', anchor: { row: 0, col: 0 }, focus: { row: rowCount - 1, col: colCount - 1 } }
}

export function selectionRect(sel: Selection, colCount: number): Rect {
  if (sel.kind === 'rows') {
    return { top: Math.min(...sel.rows), bottom: Math.max(...sel.rows), left: 0, right: colCount - 1 }
  }
  return {
    top: Math.min(sel.anchor.row, sel.focus.row),
    bottom: Math.max(sel.anchor.row, sel.focus.row),
    left: Math.min(sel.anchor.col, sel.focus.col),
    right: Math.max(sel.anchor.col, sel.focus.col),
  }
}

export function isSelected(sel: Selection | null, row: number, col: number): boolean {
  if (!sel) return false
  if (sel.kind === 'rows') return sel.rows.includes(row)
  const r = selectionRect(sel, 0)
  return row >= r.top && row <= r.bottom && col >= r.left && col <= r.right
}

/** Rows touched by the selection, ascending. */
export function selectedRows(sel: Selection | null): number[] {
  if (!sel) return []
  if (sel.kind === 'rows') return sel.rows
  const r = selectionRect(sel, 0)
  return Array.from({ length: r.bottom - r.top + 1 }, (_, i) => r.top + i)
}

/** Visible column indices covered by the selection, ascending. */
export function selectedColumns(sel: Selection | null, colCount: number): number[] {
  if (!sel) return []
  const r = selectionRect(sel, colCount)
  return Array.from({ length: r.right - r.left + 1 }, (_, i) => r.left + i)
}

/** Moves the focus cell by (dRow, dCol) inside the grid; with `extend` the anchor stays. */
export function moveFocus(
  sel: Selection | null,
  dRow: number,
  dCol: number,
  rowCount: number,
  colCount: number,
  extend: boolean,
): Selection | null {
  if (!rowCount || !colCount) return null
  const from = sel?.focus ?? { row: 0, col: 0 }
  const to = {
    row: Math.max(0, Math.min(rowCount - 1, from.row + dRow)),
    col: Math.max(0, Math.min(colCount - 1, from.col + dCol)),
  }
  if (extend && sel) return extendSelection(sel, to)
  return cellSelection(to)
}

/** "3 rows selected", "12 cells selected". */
export function selectionSummary(sel: Selection | null, colCount: number): string {
  if (!sel) return ''
  if (sel.kind === 'rows') return `${sel.rows.length} row${sel.rows.length === 1 ? '' : 's'} selected`
  const r = selectionRect(sel, colCount)
  const cells = (r.bottom - r.top + 1) * (r.right - r.left + 1)
  return `${cells} cell${cells === 1 ? '' : 's'} selected`
}
