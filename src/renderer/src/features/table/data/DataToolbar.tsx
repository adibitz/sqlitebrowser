import { useEffect, useRef, useState } from 'react'
import {
  CopyPlusIcon,
  TextCursorInputIcon,
  FilterXIcon,
  Maximize2Icon,
  PanelRightIcon,
  RefreshCwIcon,
  Rows3Icon,
  SearchIcon,
  Trash2Icon,
  TableRowsSplitIcon,
} from 'lucide-react'
import type { TableInfo } from '@shared/types/schema'
import { insertRecord } from '@/features/database/schemaActions'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { BrowseState } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { ExportMenu } from './ExportMenu'
import type { DataActions } from './useDataActions'
import { ViewKeyMenu } from './ViewKeyMenu'

interface DataToolbarProps {
  table: TableInfo
  browse: BrowseState
  actions: DataActions
  hasSelection: boolean
  filterDelay: number
  onBrowse: (patch: Partial<BrowseState>) => void
  onReload: () => void
}

/** Above the grid: records, selection mode, search, filters, export, inspector, full screen. */
export function DataToolbar({
  table,
  browse,
  actions,
  hasSelection,
  filterDelay,
  onBrowse,
  onReload,
}: DataToolbarProps) {
  const [search, setSearch] = useState(browse.globalFilter)
  const [lastGlobal, setLastGlobal] = useState(browse.globalFilter)
  const timer = useRef<number | undefined>(undefined)
  const toggleInspector = useUiStore((s) => s.toggleInspector)
  const inspectorVisible = useUiStore((s) => s.inspectorVisible)
  const setFullScreen = useUiStore((s) => s.setFullScreen)
  const hasFilters =
    Object.keys(browse.filters).length > 0 || browse.globalFilter !== '' || browse.sort.length > 0

  if (browse.globalFilter !== lastGlobal) {
    setLastGlobal(browse.globalFilter)
    setSearch(browse.globalFilter)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      <Button size="xs" variant="ghost" disabled={!actions.editable} onClick={() => void actions.addRecord()}>
        <TableRowsSplitIcon data-icon="inline-start" />
        New record
      </Button>
      {table.kind === 'table' && (
        <TooltipIconButton
          label="Insert record with values"
          disabled={!actions.editable}
          onClick={() => insertRecord({ schema: table.schema, name: table.name })}
        >
          <TextCursorInputIcon />
        </TooltipIconButton>
      )}
      <TooltipIconButton
        label="Duplicate record"
        disabled={!actions.editable || !hasSelection}
        onClick={() => void actions.duplicateRecord()}
      >
        <CopyPlusIcon />
      </TooltipIconButton>
      <TooltipIconButton
        label="Delete selected records"
        disabled={!actions.editable || !hasSelection}
        onClick={() => void actions.deleteRows()}
      >
        <Trash2Icon />
      </TooltipIconButton>
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <TooltipIconButton
        label="Select whole rows"
        aria-pressed={browse.rowSelection}
        variant={browse.rowSelection ? 'secondary' : 'ghost'}
        onClick={() => onBrowse({ rowSelection: !browse.rowSelection })}
      >
        <Rows3Icon />
      </TooltipIconButton>
      {table.kind === 'view' && <ViewKeyMenu table={table} browse={browse} onBrowse={onBrowse} />}
      <div className="relative ml-2 w-56">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          aria-label="Search all columns"
          placeholder="Search all columns"
          className="h-7 pl-7 text-micro"
          onChange={(e) => {
            const text = e.target.value
            setSearch(text)
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => onBrowse({ globalFilter: text, page: 0 }), filterDelay)
          }}
        />
      </div>
      <TooltipIconButton
        label="Clear all filters and sorting"
        disabled={!hasFilters}
        onClick={() => onBrowse({ filters: {}, globalFilter: '', sort: [], page: 0 })}
      >
        <FilterXIcon />
      </TooltipIconButton>
      <TooltipIconButton label="Refresh" onClick={onReload}>
        <RefreshCwIcon />
      </TooltipIconButton>
      <div className="ml-auto flex items-center gap-1">
        <ExportMenu
          hasSelection={hasSelection}
          onExport={actions.exportRows}
          onExportAll={actions.exportAll}
        />
        <TooltipIconButton
          label="Inspector"
          aria-pressed={inspectorVisible}
          variant={inspectorVisible ? 'secondary' : 'ghost'}
          onClick={toggleInspector}
        >
          <PanelRightIcon />
        </TooltipIconButton>
        <TooltipIconButton label="Full screen (F11)" onClick={() => setFullScreen(true)}>
          <Maximize2Icon />
        </TooltipIconButton>
      </div>
    </div>
  )
}
