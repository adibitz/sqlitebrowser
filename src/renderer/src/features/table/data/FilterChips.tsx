import { XIcon } from 'lucide-react'
import { describeFilter } from '@shared/format/filters'
import type { BrowseState } from '@/store/tabs'

interface Chip {
  id: string
  label: string
  remove: Partial<BrowseState>
}

function chips(browse: BrowseState): Chip[] {
  const out: Chip[] = Object.entries(browse.filters).map(([column, text]) => {
    const rest = { ...browse.filters }
    delete rest[column]
    return {
      id: `filter:${column}`,
      label: `${column} ${describeFilter(text)}`,
      remove: { filters: rest, page: 0 },
    }
  })
  if (browse.globalFilter) {
    out.push({
      id: 'search',
      label: `Search “${browse.globalFilter}”`,
      remove: { globalFilter: '', page: 0 },
    })
  }
  if (browse.sort.length) {
    const sorted = browse.sort.map((s) => `${s.column} ${s.direction === 'asc' ? '↑' : '↓'}`).join(', ')
    out.push({ id: 'sort', label: `Sorted by ${sorted}`, remove: { sort: [], page: 0 } })
  }
  return out
}

/** Removable chips for every active filter, the search and the sort order (click to remove). */
export function FilterChips({
  browse,
  onBrowse,
}: {
  browse: BrowseState
  onBrowse: (patch: Partial<BrowseState>) => void
}) {
  const list = chips(browse)
  if (!list.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5 border-b px-2 py-1.5" aria-label="Active filters">
      {list.map((chip) => (
        <li key={chip.id}>
          <button
            type="button"
            onClick={() => onBrowse(chip.remove)}
            aria-label={`Remove ${chip.label}`}
            className="flex h-6 items-center gap-1 rounded-sm bg-signal-tint pr-1 pl-2 text-micro text-signal-ink transition-[background-color] duration-150 outline-none hover:bg-signal-tint/70 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {chip.label}
            <XIcon className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
