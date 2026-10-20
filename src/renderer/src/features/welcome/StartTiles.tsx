import type { Command } from '@/app/commands'
import { findCommand } from '@/app/commands'
import { formatShortcut } from '@/lib/shortcuts'

const TILES = [
  { id: 'db.new', subtitle: 'Create an empty SQLite file' },
  { id: 'db.open', subtitle: 'Browse for a .db or .sqlite file' },
  { id: 'db.openReadOnly', subtitle: 'Look without risk of changes' },
  { id: 'db.memory', subtitle: 'Scratch database, nothing is saved' },
  { id: 'io.importCsv', subtitle: 'Turn a spreadsheet export into a table' },
  { id: 'io.importSql', subtitle: 'Rebuild a database from an SQL dump' },
] as const

/** The ways to start (port of the welcome page tiles). */
export function StartTiles({ commands }: { commands: Command[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TILES.map(({ id, subtitle }) => {
        const command = findCommand(commands, id)
        const Icon = command.icon
        return (
          <button
            key={id}
            type="button"
            onClick={command.run}
            className="group flex items-start gap-3 rounded-card bg-card p-4 text-left shadow-subtle transition-[translate,box-shadow] duration-400 ease-out-expo outline-none hover:-translate-y-0.5 hover:shadow-float focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0"
          >
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{command.title}</span>
              <span className="text-muted-foreground">{subtitle}</span>
            </span>
            {command.shortcut && (
              <span className="text-micro text-muted-foreground">{formatShortcut(command.shortcut)}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
