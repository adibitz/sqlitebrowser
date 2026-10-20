import type { Theme } from '@shared/settings/schema'
import { cn } from '@/lib/cn'

/** A tiny window sketch in the given theme. `.light` / `.dark` scope the tokens to the swatch. */
function Swatch({ scheme, className }: { scheme: 'light' | 'dark'; className?: string }) {
  return (
    <div className={cn(scheme, 'flex flex-col gap-1 bg-background p-2', className)}>
      <div className="h-1.5 w-8 rounded-xs bg-foreground" />
      <div className="h-1.5 w-12 rounded-xs bg-muted-foreground/50" />
      <div className="mt-1 h-3 rounded-xs bg-card shadow-subtle" />
    </div>
  )
}

export function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div aria-hidden className="flex h-16 w-full overflow-hidden rounded-sm border border-border">
      {theme === 'system' ? (
        <>
          <Swatch scheme="light" className="flex-1" />
          <Swatch scheme="dark" className="flex-1" />
        </>
      ) : (
        <Swatch scheme={theme} className="flex-1" />
      )}
    </div>
  )
}
