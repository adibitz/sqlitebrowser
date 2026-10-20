import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

// DESIGN.md Buttons: always pills, 2px signal focus ring with 2px offset, press scales to 0.97.
const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent',
    'font-medium whitespace-nowrap select-none outline-none',
    'transition-[color,background-color,border-color,scale] duration-200 ease-out-expo active:scale-97 motion-reduce:active:scale-100',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),var(--background)_14%)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-3',
        outline:
          'border-hairline-strong bg-transparent text-foreground hover:border-hover-stroke hover:bg-surface-2 aria-expanded:bg-surface-2',
        ghost: 'bg-transparent text-foreground hover:bg-surface-2 aria-expanded:bg-surface-2',
        signal: 'bg-signal text-on-signal hover:bg-[color-mix(in_oklab,var(--signal),var(--background)_14%)]',
        destructive:
          'bg-destructive-tint text-destructive-ink hover:bg-[color-mix(in_oklab,var(--destructive-tint),var(--destructive)_12%)]',
        link: 'h-auto px-0 text-signal underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-11 px-5 text-[0.9375rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        lg: 'h-13 px-7 text-body has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6',
        sm: 'h-9 px-4 text-body-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-7 gap-1 px-3 text-micro font-medium has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'sm',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
