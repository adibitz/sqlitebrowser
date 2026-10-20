import { KeyRoundIcon } from 'lucide-react'
import type { TableInfo } from '@shared/types/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BrowseState } from '@/store/tabs'

/** Views have no rowid; choosing a key column lets them be edited (needs INSTEAD OF triggers). */
export function ViewKeyMenu({
  table,
  browse,
  onBrowse,
}: {
  table: TableInfo
  browse: BrowseState
  onBrowse: (patch: Partial<BrowseState>) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="xs" variant={browse.pseudoPk.length ? 'secondary' : 'ghost'}>
            <KeyRoundIcon data-icon="inline-start" />
            {browse.pseudoPk.length ? `Key: ${browse.pseudoPk.join(', ')}` : 'Choose key'}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Edit this view by key column</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onBrowse({ pseudoPk: [] })}>No key (read-only)</DropdownMenuItem>
          {table.columns.map((c) => (
            <DropdownMenuItem key={c.name} onClick={() => onBrowse({ pseudoPk: [c.name] })}>
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
