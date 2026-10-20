import { StateEffect, StateField, type EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

export type MarkKind = 'executed' | 'error'

export interface RangeMark {
  from: number
  to: number
  kind: MarkKind
}

/** Replaces the execution marks (port of set_executing_range / set_error_range / clear_marks). */
export const setMarks = StateEffect.define<RangeMark[]>()

const executed = Decoration.mark({ class: 'cm-sql-executed' })
const error = Decoration.mark({ class: 'cm-sql-error' })
const errorLine = Decoration.line({ class: 'cm-sql-error-line' })

function build(marks: RangeMark[], state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const len = state.doc.length
  for (const m of marks) {
    const from = Math.max(0, Math.min(m.from, len))
    const to = Math.max(from, Math.min(m.to, len))
    if (to === from) continue
    ranges.push((m.kind === 'error' ? error : executed).range(from, to))
    if (m.kind === 'error') ranges.push(errorLine.range(state.doc.lineAt(from).from))
  }
  return Decoration.set(ranges, true)
}

export const marksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    let next = decorations.map(tr.changes)
    for (const e of tr.effects) if (e.is(setMarks)) next = build(e.value, tr.state)
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})
