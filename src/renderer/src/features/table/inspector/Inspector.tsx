import { XIcon } from 'lucide-react'
import { valueToText } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { useUiStore } from '@/store/ui'
import { InspectorBody } from './InspectorBody'

export interface InspectedCell {
  column: string
  rowNumber: number
  value: SqlValue
  editable: boolean
}

interface InspectorProps {
  cell: InspectedCell | null
  onApply: (value: string | null | Uint8Array) => Promise<boolean>
}

/** Panel showing the selected cell (port of reference/sqliteview/ui/inspector.py). */
export function Inspector({ cell, onApply }: InspectorProps) {
  const close = useUiStore((s) => s.toggleInspector)
  return (
    <aside className="flex h-full flex-col border-l bg-background" aria-label="Inspector">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="font-medium">Inspector</h2>
        <TooltipIconButton label="Close inspector" onClick={close}>
          <XIcon />
        </TooltipIconButton>
      </div>
      {cell ? (
        <InspectorBody
          key={`${cell.column}:${cell.rowNumber}:${String(valueToText(cell.value)).length}`}
          cell={cell}
          onApply={onApply}
        />
      ) : (
        <p className="p-4 text-muted-foreground">Select a cell to see its full value.</p>
      )}
    </aside>
  )
}
