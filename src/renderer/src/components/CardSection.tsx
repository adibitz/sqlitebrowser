import type { ReactNode } from 'react'

/** A labelled group of content on a default card (surface-1, subtle lift, no border). */
export function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label font-medium text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-card bg-card shadow-subtle">{children}</div>
    </section>
  )
}
