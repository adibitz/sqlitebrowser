import { CircleCheckIcon, CircleXIcon } from 'lucide-react'
import type { RunMessage } from './useSqlRun'

/** Outcome of each statement of the last run (port of the SQL tab's message pane). */
export function MessageList({ messages }: { messages: RunMessage[] }) {
  if (!messages.length) {
    return <p className="p-3 text-micro text-muted-foreground">Messages from the last run appear here.</p>
  }
  return (
    <ol
      className="flex flex-col gap-1 overflow-auto p-3 font-mono text-micro"
      aria-label="Messages"
      aria-live="polite"
    >
      {messages.map((m, i) => (
        <li key={i} className="flex gap-2 whitespace-pre-wrap">
          {m.error ? (
            <CircleXIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="Error" />
          ) : (
            <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Done" />
          )}
          <span className={m.error ? 'text-destructive' : 'text-muted-foreground'}>{m.text}</span>
        </li>
      ))}
    </ol>
  )
}
