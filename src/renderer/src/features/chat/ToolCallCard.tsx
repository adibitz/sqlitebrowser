import { useState } from 'react'
import { BanIcon, ChevronRightIcon, CircleAlertIcon, DatabaseIcon, LoaderCircleIcon } from 'lucide-react'
import type { ToolCallView } from '@shared/types/chat'
import { cn } from '@/lib/cn'

const ICONS = {
  running: LoaderCircleIcon,
  done: DatabaseIcon,
  error: CircleAlertIcon,
  denied: BanIcon,
} as const

/** One tool call: a summary line that opens to show its SQL and rows. */
export function ToolCallCard({ call }: { call: ToolCallView }) {
  const [open, setOpen] = useState(false)
  const Icon = ICONS[call.status]
  const hasDetails = !!(call.sql || call.table || call.error)

  return (
    <div className="rounded-card border bg-card text-label">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left disabled:cursor-default"
        disabled={!hasDetails}
        aria-expanded={hasDetails ? open : undefined}
        onClick={() => setOpen(!open)}
      >
        <Icon
          className={cn(
            'size-3.5 shrink-0',
            call.status === 'running' && 'animate-spin text-muted-foreground motion-reduce:animate-none',
            call.status === 'done' && 'text-signal',
            call.status === 'error' && 'text-destructive',
            call.status === 'denied' && 'text-muted-foreground',
          )}
        />
        <span className="min-w-0 flex-1 truncate">{call.summary}</span>
        {hasDetails && (
          <ChevronRightIcon
            className={cn(
              'size-3.5 text-muted-foreground transition-transform duration-150',
              open && 'rotate-90',
            )}
          />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t px-3 py-2">
          {call.sql && (
            <pre className="overflow-x-auto font-mono whitespace-pre-wrap text-foreground select-text">
              {call.sql}
            </pre>
          )}
          {call.error && <p className="text-destructive select-text">{call.error}</p>}
          {call.table && (
            <div className="max-h-56 overflow-auto rounded-xs border">
              <table className="w-full tabular-nums">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    {call.table.columns.map((c, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {call.table.rows.slice(0, 50).map((row, r) => (
                    <tr key={r} className="border-t">
                      {row.map((v, c) => (
                        <td
                          key={c}
                          className={cn(
                            'max-w-48 truncate px-2 py-0.5',
                            v === null && 'text-muted-foreground italic',
                          )}
                        >
                          {v === null ? 'NULL' : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
