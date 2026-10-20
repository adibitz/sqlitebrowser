import { SearchIcon } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { formatShortcut } from '@/lib/shortcuts'
import { useUiStore } from '@/store/ui'

/** Looks like a search field; opens the command palette. */
export function PaletteTrigger() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      className="flex h-8 w-full max-w-80 items-center gap-2 rounded-field border border-input bg-card px-3 text-body-sm text-muted-foreground transition-[border-color] duration-200 outline-none hover:border-hover-stroke focus-visible:border-ring"
    >
      <SearchIcon className="size-4" />
      <span className="flex-1 truncate text-left">Search commands, tables, columns…</span>
      <Kbd>{formatShortcut('Mod+K')}</Kbd>
    </button>
  )
}
