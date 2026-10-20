import { useEffect, useRef, useState } from 'react'
import { FunnelIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/cn'
import { FilterBuilder } from './FilterBuilder'

interface FilterCellProps {
  column: string
  value: string
  delay: number
  escape: string
  onChange: (text: string) => void
}

/** The filter-row input of one column, debounced, with the filter builder behind the funnel. */
export function FilterCell({ column, value, delay, escape, onChange }: FilterCellProps) {
  const [draft, setDraft] = useState(value)
  const [builderOpen, setBuilderOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const [lastValue, setLastValue] = useState(value)

  // A filter set elsewhere (chip removed, builder, clear all) replaces what is typed here.
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const change = (text: string): void => {
    setDraft(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(text), delay)
  }

  return (
    <div className="group/filter relative flex h-full items-center px-1">
      <input
        value={draft}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            window.clearTimeout(timer.current)
            onChange(draft)
          }
          e.stopPropagation()
        }}
        placeholder="Filter"
        aria-label={`Filter ${column}`}
        className={cn(
          'h-6 w-full min-w-0 rounded-control border border-transparent bg-transparent px-1.5 pr-6 text-micro outline-none placeholder:text-muted-foreground/70',
          'transition-[border-color,background-color] duration-150 hover:border-input focus:border-ring focus:bg-card',
          draft && 'border-input bg-signal-tint/50 font-medium',
        )}
      />
      <Popover open={builderOpen} onOpenChange={setBuilderOpen}>
        <PopoverTrigger
          aria-label={`Filter builder for ${column}`}
          className="absolute right-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/filter:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:opacity-100"
        >
          <FunnelIcon className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-4">
          <FilterBuilder
            column={column}
            value={draft}
            escape={escape}
            onApply={(text) => {
              setBuilderOpen(false)
              setDraft(text)
              onChange(text)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
