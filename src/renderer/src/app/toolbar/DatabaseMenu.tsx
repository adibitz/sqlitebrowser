import { ChevronDownIcon, DatabaseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fileName } from '@/features/database/fileName'
import { formatShortcut } from '@/lib/shortcuts'
import { useDbStore } from '@/store/db'
import type { Command } from '../commands'

const ITEMS = [
  'db.saveAs',
  'db.attach',
  'db.reveal',
  'db.refresh',
  null,
  'project.save',
  'project.saveAs',
  null,
  'io.importCsv',
  'io.importSql',
  'io.exportData',
  'io.exportSql',
  null,
  'db.info',
  null,
  'db.close',
] as const

/** The current database's name; its menu holds the file-level commands. */
export function DatabaseMenu({ commands }: { commands: Command[] }) {
  const state = useDbStore((s) => s.state)
  const label = state.isOpen ? fileName(state.path) : 'No database'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={!state.isOpen}
            className="max-w-64 font-medium"
            title={state.path}
          >
            <DatabaseIcon data-icon="inline-start" className="text-signal" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        {ITEMS.map((id, i) => {
          if (id === null) return <DropdownMenuSeparator key={`sep-${i}`} />
          const command = commands.find((c) => c.id === id)!
          const Icon = command.icon
          return (
            <DropdownMenuItem key={id} disabled={!command.enabled} onClick={command.run}>
              <Icon />
              {command.title}
              {command.shortcut && (
                <DropdownMenuShortcut>{formatShortcut(command.shortcut)}</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
