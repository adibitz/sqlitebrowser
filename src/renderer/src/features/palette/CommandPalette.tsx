import { useState } from 'react'
import { Columns3Icon, EyeIcon, HistoryIcon, TableIcon } from 'lucide-react'
import { objectDisplayName } from '@shared/types/schema'
import type { Command } from '@/app/commands'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Command as CommandRoot } from '@/components/ui/command'
import { openDatabaseAt } from '@/features/database/actions'
import { formatShortcut } from '@/lib/shortcuts'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { paletteFilter } from './fuzzyScore'

/** Columns are only listed once the query is this long, so the list stays short. */
const COLUMN_QUERY_MIN = 2

/** Ctrl+K: run any command, open any table/column, reopen recent files (port of command_palette.py). */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const open = useUiStore((s) => s.paletteOpen)
  const setOpen = useUiStore((s) => s.setPaletteOpen)
  const schemata = useDbStore((s) => s.state.schemata)
  const recent = useDbStore((s) => s.recent)
  const [query, setQuery] = useState('')

  const run = (fn: () => void): void => {
    setOpen(false)
    setQuery('')
    fn()
  }
  const tables = schemata.flatMap((s) => s.tables.filter((t) => t.kind !== 'system'))

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search commands, tables and columns"
    >
      <CommandRoot filter={paletteFilter}>
        <CommandInput placeholder="Type a command, table or column" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>
          <CommandGroup heading="Commands">
            {commands
              .filter((c) => c.enabled && c.id !== 'view.palette')
              .map((c) => {
                const Icon = c.icon
                return (
                  <CommandItem key={c.id} value={c.title} onSelect={() => run(c.run)}>
                    <Icon />
                    {c.title}
                    {c.shortcut && <CommandShortcut>{formatShortcut(c.shortcut)}</CommandShortcut>}
                  </CommandItem>
                )
              })}
          </CommandGroup>
          {tables.length > 0 && (
            <CommandGroup heading="Tables and views">
              {tables.map((t) => {
                const ref = { schema: t.schema, name: t.name }
                const Icon = t.kind === 'view' ? EyeIcon : TableIcon
                return (
                  <CommandItem
                    key={`${t.schema}.${t.name}`}
                    value={`${objectDisplayName(ref)} ${t.kind}`}
                    onSelect={() => run(() => useTabsStore.getState().openTable(ref))}
                  >
                    <Icon />
                    {objectDisplayName(ref)}
                    <span className="ml-auto text-micro text-muted-foreground">
                      {t.kind === 'view' ? 'View' : 'Table'}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
          {query.trim().length >= COLUMN_QUERY_MIN && (
            <CommandGroup heading="Columns">
              {tables.flatMap((t) =>
                t.columns.map((c) => {
                  const ref = { schema: t.schema, name: t.name }
                  return (
                    <CommandItem
                      key={`${t.schema}.${t.name}.${c.name}`}
                      value={`${t.name}.${c.name}`}
                      onSelect={() => run(() => useTabsStore.getState().openTable(ref, 'structure'))}
                    >
                      <Columns3Icon />
                      {t.name}.{c.name}
                      <span className="ml-auto text-micro text-muted-foreground">{c.type || 'no type'}</span>
                    </CommandItem>
                  )
                }),
              )}
            </CommandGroup>
          )}
          {recent.some((f) => f.exists) && (
            <CommandGroup heading="Recent databases">
              {recent
                .filter((f) => f.exists)
                .map((f) => (
                  <CommandItem
                    key={f.path}
                    value={`${f.name} ${f.folder}`}
                    onSelect={() => run(() => void openDatabaseAt(f.path, f.readOnly))}
                  >
                    <HistoryIcon />
                    {f.name}
                    <span className="ml-auto max-w-60 truncate text-micro text-muted-foreground">
                      {f.folder}
                    </span>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandRoot>
    </CommandDialog>
  )
}
