import { ClipboardCopyIcon, Trash2Icon, XIcon } from 'lucide-react'
import { ROW_FORMATS, type RowFormat } from '@shared/format/rowExport'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataActions } from './useDataActions'

interface SelectionBarProps {
  summary: string
  actions: DataActions
  onClear: () => void
}

const FORMATS = Object.entries(ROW_FORMATS) as [RowFormat, string][]

/** Shown while more than one cell is selected: count, copy as…, set NULL, delete, clear. */
export function SelectionBar({ summary, actions, onClear }: SelectionBarProps) {
  return (
    <div
      className="flex items-center gap-1 border-t bg-signal-tint/40 px-3 py-1"
      role="region"
      aria-label="Selection"
    >
      <span className="mr-2 text-micro font-medium tabular-nums" aria-live="polite">
        {summary}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="xs" variant="ghost">
              <ClipboardCopyIcon data-icon="inline-start" />
              Copy as
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => void actions.copySelection('cells')}>
            Cells (tab separated)
          </DropdownMenuItem>
          {FORMATS.map(([key, label]) => (
            <DropdownMenuItem key={key} onClick={() => void actions.copySelection(key)}>
              Rows as {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="xs"
        variant="ghost"
        disabled={!actions.editable}
        onClick={() => void actions.setSelectionNull()}
      >
        Set NULL
      </Button>
      <Button
        size="xs"
        variant="ghost"
        disabled={!actions.editable}
        onClick={() => void actions.deleteRows()}
      >
        <Trash2Icon data-icon="inline-start" />
        Delete rows
      </Button>
      <TooltipIconButton label="Clear selection" className="ml-auto" onClick={onClear}>
        <XIcon />
      </TooltipIconButton>
    </div>
  )
}
