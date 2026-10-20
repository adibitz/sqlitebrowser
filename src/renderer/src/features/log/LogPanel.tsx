import { useEffect, useRef, useState } from 'react'
import { Trash2Icon, XIcon } from 'lucide-react'
import type { LogSource } from '@shared/types/db'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/cn'
import { useLogStore } from '@/store/log'
import { useUiStore } from '@/store/ui'

type Filter = 'user' | 'app' | 'all'

const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const LABEL: Record<LogSource, string> = { user: 'You', app: 'App', error: 'Error' }

/** Every statement sent to SQLite: yours (SQL editor) and the app's (port of log_panel.py). */
export function LogPanel() {
  const entries = useLogStore((s) => s.entries)
  const clear = useLogStore((s) => s.clear)
  const toggle = useUiStore((s) => s.toggleLog)
  const [filter, setFilter] = useState<Filter>('user')
  const end = useRef<HTMLDivElement>(null)
  const shown =
    filter === 'all' ? entries : entries.filter((e) => e.source === filter || e.source === 'error')

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [shown.length])

  return (
    <section className="flex h-full flex-col bg-background" aria-label="SQL log">
      <div className="flex items-center gap-2 border-b px-3 py-1">
        <h2 className="font-medium">SQL log</h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-7">
            <TabsTrigger value="user">Submitted by you</TabsTrigger>
            <TabsTrigger value="app">By the app</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-1">
          <TooltipIconButton label="Clear the log" onClick={clear}>
            <Trash2Icon />
          </TooltipIconButton>
          <TooltipIconButton label="Close the log" onClick={toggle}>
            <XIcon />
          </TooltipIconButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-micro">
        {shown.length === 0 && <p className="font-sans text-muted-foreground">Nothing logged yet.</p>}
        {shown.map((e, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="shrink-0 text-muted-foreground tabular-nums">{time.format(e.time)}</span>
            <span
              className={cn(
                'w-10 shrink-0 font-sans',
                e.source === 'error' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {LABEL[e.source]}
            </span>
            <span className="break-all whitespace-pre-wrap">{e.sql}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
    </section>
  )
}
