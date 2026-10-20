import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TooltipIconButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  /** Accessible name and tooltip text. */
  label: string
  children: ReactNode
}

/** Icon-only button whose label shows as a tooltip and is its aria-label. */
export function TooltipIconButton({
  label,
  children,
  variant = 'ghost',
  size = 'icon-xs',
  ...props
}: TooltipIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant={variant} size={size} aria-label={label} {...props}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
