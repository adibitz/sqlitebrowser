import { useEffect, useSyncExternalStore } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { TableInfo } from '@shared/types/schema'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { displayCell, type DisplayOptions } from './cellDisplay'
import type { RowCache } from './rowCache'

interface RecordDialogProps {
  table: TableInfo
  cache: RowCache
  /** Absolute row index, or null when closed. */
  index: number | null
  total: number
  display: DisplayOptions
  onIndex: (index: number | null) => void
}

/** Every column of one row, with previous/next (port of dialogs/record_view.py). */
export function RecordDialog({ table, cache, index, total, display, onIndex }: RecordDialogProps) {
  useSyncExternalStore(cache.subscribe, cache.getVersion)
  useEffect(() => {
    if (index !== null) cache.ensure(index, index + 1)
  }, [cache, index])
  const row = index === null ? undefined : cache.rowAt(index)

  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && onIndex(null)}>
      <DialogContent className="max-h-[80vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Row {((index ?? 0) + 1).toLocaleString()} of {total.toLocaleString()}
          </DialogTitle>
          <DialogDescription>{table.name}</DialogDescription>
        </DialogHeader>
        <dl className="-mx-6 grid max-h-[50vh] grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1 overflow-y-auto px-6">
          {table.columns.map((c, i) => {
            const cell = row ? displayCell(row[i + 1], { ...display, symbolLimit: 10_000 }) : null
            return (
              <div key={c.name} className="contents">
                <dt className="truncate py-1 text-label font-medium text-muted-foreground">{c.name}</dt>
                <dd
                  className={
                    'py-1 break-words whitespace-pre-wrap ' +
                    (cell?.kind === 'null' || cell?.kind === 'blob' ? 'text-muted-foreground italic' : '')
                  }
                >
                  {cell ? cell.text : '…'}
                </dd>
              </div>
            )
          })}
        </dl>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={index === null || index <= 0}
            onClick={() => index !== null && onIndex(index - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={index === null || index >= total - 1}
            onClick={() => index !== null && onIndex(index + 1)}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
