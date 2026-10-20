import type { ReactNode } from 'react'

/** One muted line explaining that a list is empty. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 text-muted-foreground">{children}</p>
}
