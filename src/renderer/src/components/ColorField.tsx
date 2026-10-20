import { XIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ColorFieldProps {
  /** '#rrggbb', or '' for the default colour. */
  value: string
  label: string
  onChange: (value: string) => void
}

/** A colour swatch that opens the system colour picker, with a button back to the default. */
export function ColorField({ value, label, onChange }: ColorFieldProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <label
        className={cn(
          'relative flex h-7 w-28 cursor-pointer items-center gap-2 rounded-field border border-input px-2 text-micro',
          'focus-within:border-ring hover:border-hover-stroke',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'size-4 shrink-0 rounded-xs border',
            !value &&
              'bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:8px_8px]',
          )}
          style={value ? { backgroundColor: value } : undefined}
        />
        <span className="font-mono uppercase">{value || 'Default'}</span>
        <input
          type="color"
          aria-label={label}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {/* Always takes its place, so fields in a list line up. */}
      <button
        type="button"
        aria-label={`Reset ${label.toLowerCase()}`}
        className={cn(
          'flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground',
          !value && 'invisible',
        )}
        onClick={() => onChange('')}
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}
