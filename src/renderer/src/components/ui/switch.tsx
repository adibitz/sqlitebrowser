import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/cn'

// DESIGN.md Switch: 40×24 pill track, Stone when off and ink when on; the thumb slides in 200ms.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 outline-none',
        'transition-[background-color] duration-200 after:absolute after:-inset-x-3 after:-inset-y-2',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-surface-3',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-card shadow-subtle transition-transform duration-200 ease-out-expo data-checked:translate-x-4 data-checked:bg-primary-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
