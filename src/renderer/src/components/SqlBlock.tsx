import { cn } from '@/lib/cn'

/** Read-only SQL in the monospace stack, selectable and scrollable. */
export function SqlBlock({ sql, className, empty }: { sql: string; className?: string; empty?: string }) {
  if (!sql) return <p className={cn('p-6 text-muted-foreground', className)}>{empty ?? 'No SQL to show.'}</p>
  return (
    <pre
      className={cn(
        'overflow-auto p-4 font-mono text-body-sm leading-relaxed whitespace-pre text-foreground select-text',
        className,
      )}
      tabIndex={0}
    >
      <code>{sql}</code>
    </pre>
  )
}
