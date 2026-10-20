import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/cn'

// DESIGN.md Inputs: surface-1, hairline-strong stroke, 10px corners; focus turns the border signal, no ring.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-field border border-input bg-card px-3 text-body-sm text-foreground',
        'transition-[border-color] duration-200 outline-none placeholder:text-muted-foreground',
        'hover:border-hover-stroke focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
