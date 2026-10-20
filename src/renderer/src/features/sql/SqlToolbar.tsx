import {
  FolderOpenIcon,
  MessageSquareCodeIcon,
  PlayIcon,
  SaveIcon,
  SearchIcon,
  StepForwardIcon,
  TextCursorInputIcon,
} from 'lucide-react'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatShortcut } from '@/lib/shortcuts'
import type { RunKind } from './editor/SqlEditor'

interface SqlToolbarProps {
  running: boolean
  canRun: boolean
  onRun: (kind: RunKind) => void
  onOpen: () => void
  onSave: () => void
  onComment: () => void
  onFind: () => void
}

/** Run buttons, file and editing actions (port of the SQL tab's toolbar). */
export function SqlToolbar({ running, canRun, onRun, onOpen, onSave, onComment, onFind }: SqlToolbarProps) {
  const disabled = running || !canRun
  return (
    <div className="flex items-center gap-1 border-b px-2 py-1.5" role="toolbar" aria-label="SQL">
      <Button size="xs" disabled={disabled} onClick={() => onRun('all')} title={formatShortcut('Mod+Enter')}>
        <PlayIcon data-icon="inline-start" />
        {running ? 'Running…' : 'Run'}
      </Button>
      <TooltipIconButton
        label={`Run current statement (${formatShortcut('Shift+F5')})`}
        disabled={disabled}
        onClick={() => onRun('current')}
      >
        <StepForwardIcon />
      </TooltipIconButton>
      <TooltipIconButton
        label={`Run current line (${formatShortcut('Shift+F6')})`}
        disabled={disabled}
        onClick={() => onRun('line')}
      >
        <TextCursorInputIcon />
      </TooltipIconButton>
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <TooltipIconButton label="Open SQL file" onClick={onOpen}>
        <FolderOpenIcon />
      </TooltipIconButton>
      <TooltipIconButton label={`Save SQL file (${formatShortcut('Mod+Shift+S')})`} onClick={onSave}>
        <SaveIcon />
      </TooltipIconButton>
      <TooltipIconButton label={`Toggle comment (${formatShortcut('Mod+/')})`} onClick={onComment}>
        <MessageSquareCodeIcon />
      </TooltipIconButton>
      <TooltipIconButton label={`Find and replace (${formatShortcut('Mod+F')})`} onClick={onFind}>
        <SearchIcon />
      </TooltipIconButton>
      <span className="ml-auto hidden truncate text-micro text-muted-foreground lg:inline">
        {formatShortcut('Mod+Enter')} run · {formatShortcut('Shift+F5')} statement ·{' '}
        {formatShortcut('Mod+Space')} complete
      </span>
    </div>
  )
}
