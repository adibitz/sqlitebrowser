import { DownloadIcon } from 'lucide-react'
import { ROW_FORMATS, type RowFormat } from '@shared/format/rowExport'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataActions } from './useDataActions'

const FORMATS = Object.entries(ROW_FORMATS) as [RowFormat, string][]

/** Export every row (as filtered), the current page or the selected rows in any row format. */
export function ExportMenu({
  hasSelection,
  onExport,
  onExportAll,
}: {
  hasSelection: boolean
  onExport: DataActions['exportRows']
  onExportAll: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="xs" variant="ghost">
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={onExportAll}>All rows, as filtered…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Current page as</DropdownMenuLabel>
          {FORMATS.map(([key, label]) => (
            <DropdownMenuItem key={`page-${key}`} onClick={() => void onExport('page', key)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Selected rows as</DropdownMenuLabel>
          {FORMATS.map(([key, label]) => (
            <DropdownMenuItem
              key={`sel-${key}`}
              disabled={!hasSelection}
              onClick={() => void onExport('selected', key)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
