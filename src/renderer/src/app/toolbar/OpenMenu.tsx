import { ChevronDownIcon, DatabaseIcon, FolderKanbanIcon, HistoryIcon, TrashIcon } from 'lucide-react'
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
import { clearRecentFiles, openDatabaseAt } from '@/features/database/actions'
import { openProject } from '@/features/project/projectActions'
import { isProjectFile } from '@shared/project/sqbpro'
import { useDbStore } from '@/store/db'
import type { Command } from '../commands'
import { CommandButton } from '@/components/CommandButton'

/** "Open" with a split arrow listing recent files (port of the Open toolbar button + recent menu). */
export function OpenMenu({ command }: { command: Command }) {
  const recent = useDbStore((s) => s.recent)

  return (
    <div className="flex items-center">
      <CommandButton command={command} label="Open" className="rounded-r-none pr-2" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-1 w-7 rounded-l-none"
              aria-label="Recent databases"
            >
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Recent</DropdownMenuLabel>
            {recent.length === 0 && <DropdownMenuItem disabled>No recent databases</DropdownMenuItem>}
            {recent.map((file) => (
              <DropdownMenuItem
                key={file.path}
                disabled={!file.exists}
                title={file.path}
                onClick={() => void openDatabaseAt(file.path, file.readOnly)}
              >
                {!file.exists ? (
                  <HistoryIcon />
                ) : isProjectFile(file.path) ? (
                  <FolderKanbanIcon />
                ) : (
                  <DatabaseIcon />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{file.name}</span>
                  <span className="truncate text-micro text-muted-foreground">
                    {file.exists ? file.folder : 'Missing'}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void openProject()}>
            <FolderKanbanIcon />
            Open project…
          </DropdownMenuItem>
          {recent.length > 0 && (
            <>
              <DropdownMenuItem onClick={() => void clearRecentFiles()}>
                <TrashIcon />
                Clear recent databases
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
