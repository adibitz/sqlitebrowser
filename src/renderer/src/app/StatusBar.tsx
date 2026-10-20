import { LoaderCircleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useDbStore } from '@/store/db'

/** Bottom bar: file, pending work, read-only and uncommitted-changes state (port of _build_statusbar). */
export function StatusBar() {
  const state = useDbStore((s) => s.state)
  const busy = useDbStore((s) => s.busy)
  const sqlite = useDbStore((s) => s.sqliteVersion)

  return (
    <footer className="flex h-7 items-center gap-3 border-t bg-background px-3 text-micro text-muted-foreground">
      <span className="min-w-0 flex-1 truncate" title={state.path}>
        {state.isOpen ? state.path : 'No database open'}
      </span>
      {busy && (
        <span role="status" className="flex items-center gap-1.5">
          <LoaderCircleIcon className="size-3.5 animate-spin motion-reduce:animate-none" />
          {busy}…
        </span>
      )}
      {state.isOpen && state.readOnly && (
        <Badge variant="destructive" className="h-5">
          Read-only
        </Badge>
      )}
      {state.dirty && (
        <Badge variant="warning" className="h-5">
          Uncommitted changes
        </Badge>
      )}
      {state.encoding && <span>{state.encoding}</span>}
      {sqlite && <span className="tabular-nums">SQLite {sqlite}</span>}
    </footer>
  )
}
