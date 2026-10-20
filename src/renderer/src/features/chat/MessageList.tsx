import { useEffect, useRef } from 'react'
import { CircleAlertIcon } from 'lucide-react'
import type { ChatItem } from '@shared/types/chat'
import { ApprovalCard } from './ApprovalCard'
import { ChatMarkdown } from './ChatMarkdown'
import { ToolCallCard } from './ToolCallCard'

/** Distance from the bottom within which new content keeps the list scrolled down. */
const STICK_PX = 80

/** The conversation, kept scrolled to the newest message while you are at the bottom. */
export function MessageList({ items, busy }: { items: ChatItem[]; busy: boolean }) {
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [items])

  return (
    <div
      ref={scroller}
      role="log"
      aria-label="Conversation"
      aria-busy={busy}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
      onScroll={(e) => {
        const el = e.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX
      }}
    >
      {items.map((item) => {
        switch (item.kind) {
          case 'user':
            return (
              <p
                key={item.id}
                className="max-w-[90%] self-end rounded-card bg-surface-2 px-3 py-2 text-body-sm whitespace-pre-wrap select-text"
              >
                {item.text}
              </p>
            )
          case 'assistant':
            return <ChatMarkdown key={item.id} text={item.text} />
          case 'tool':
            return <ToolCallCard key={item.id} call={item.call} />
          case 'approval':
            return <ApprovalCard key={item.id} item={item} />
          case 'error':
            return (
              <p key={item.id} role="alert" className="flex items-start gap-2 text-label text-destructive">
                <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                {item.text}
              </p>
            )
        }
      })}
      {busy && items.at(-1)?.kind === 'user' && (
        <p className="text-label text-muted-foreground" aria-live="polite">
          Thinking…
        </p>
      )}
    </div>
  )
}
