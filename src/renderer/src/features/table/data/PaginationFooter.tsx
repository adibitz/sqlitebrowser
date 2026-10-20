import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZES = [50, 100, 500, 1000, 5000, 0] as const

interface PaginationFooterProps {
  total: number | null
  pageSize: number
  page: number
  filtered: boolean
  onPageSize: (size: number) => void
  onPage: (page: number) => void
  onGoToRow: (rowNumber: number) => void
}

const sizeItems = PAGE_SIZES.map((n) => ({ value: String(n), label: n ? n.toLocaleString() : 'All' }))

/** "Showing 101–200 of 500", rows per page, page navigation, go to row (port of the table tab footer). */
export function PaginationFooter({
  total,
  pageSize,
  page,
  filtered,
  onPageSize,
  onPage,
  onGoToRow,
}: PaginationFooterProps) {
  const [goto, setGoto] = useState('')
  const pageCount = pageSize && total !== null ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const first = total ? (pageSize ? page * pageSize + 1 : 1) : 0
  const last = total === null ? 0 : pageSize ? Math.min(total, (page + 1) * pageSize) : total

  return (
    <footer className="flex flex-wrap items-center gap-3 border-t bg-background px-3 py-1.5 text-micro text-muted-foreground">
      <span className="tabular-nums" aria-live="polite">
        {total === null
          ? 'Counting rows…'
          : total === 0
            ? `No rows${filtered ? ' (filtered)' : ''}`
            : `Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}${filtered ? ' (filtered)' : ''}`}
      </span>
      <label className="ml-auto flex items-center gap-2">
        Rows per page
        <Select items={sizeItems} value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {pageSize > 0 && (
        <nav className="flex items-center gap-0.5" aria-label="Pages">
          <TooltipIconButton label="First page" disabled={page === 0} onClick={() => onPage(0)}>
            <ChevronsLeftIcon />
          </TooltipIconButton>
          <TooltipIconButton label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>
            <ChevronLeftIcon />
          </TooltipIconButton>
          <span className="px-2 tabular-nums">
            Page {(page + 1).toLocaleString()} of {pageCount.toLocaleString()}
          </span>
          <TooltipIconButton
            label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRightIcon />
          </TooltipIconButton>
          <TooltipIconButton
            label="Last page"
            disabled={page >= pageCount - 1}
            onClick={() => onPage(pageCount - 1)}
          >
            <ChevronsRightIcon />
          </TooltipIconButton>
        </nav>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number(goto)
          if (Number.isInteger(n) && n >= 1 && total !== null && n <= total) onGoToRow(n)
        }}
      >
        <label htmlFor="goto-row">Go to row</label>
        <Input
          id="goto-row"
          inputMode="numeric"
          value={goto}
          onChange={(e) => setGoto(e.target.value.replace(/\D/g, ''))}
          className="h-7 w-20 text-micro tabular-nums"
        />
      </form>
    </footer>
  )
}
