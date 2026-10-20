import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from '@/lib/cn'

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive data-slot="radio-group" className={cn('grid w-full gap-2', className)} {...props} />
  )
}

// DESIGN.md Radio: 18px circle, ink fill with a paper dot when checked, signal focus ring.
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'group/radio-group-item peer relative flex size-[18px] shrink-0 items-center justify-center rounded-full',
        'border border-input bg-card transition-[background-color,border-color] duration-200 outline-none',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-checked:border-primary data-checked:bg-primary',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2 rounded-full bg-primary-foreground transition-[scale,opacity] duration-200 ease-out-expo data-ending-style:scale-0 data-starting-style:scale-0"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
