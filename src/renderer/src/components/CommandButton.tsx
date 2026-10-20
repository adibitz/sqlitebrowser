import type { ComponentProps } from 'react'
import type { Command } from '@/app/commands'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatShortcut } from '@/lib/shortcuts'

interface CommandButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  command: Command
  /** Show only the icon; the title moves to the tooltip and aria-label. */
  iconOnly?: boolean
  label?: string
}

/** A toolbar button for a command, with its shortcut in the tooltip. */
export function CommandButton({
  command,
  iconOnly = false,
  label,
  variant = 'ghost',
  size,
  ...props
}: CommandButtonProps) {
  const Icon = command.icon
  const button = (
    <Button
      variant={variant}
      size={size ?? (iconOnly ? 'icon-sm' : 'sm')}
      disabled={!command.enabled}
      aria-label={iconOnly ? command.title : undefined}
      onClick={command.run}
      {...props}
    >
      <Icon data-icon={iconOnly ? undefined : 'inline-start'} />
      {!iconOnly && (label ?? command.title)}
    </Button>
  )
  if (!iconOnly && !command.shortcut) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        {command.title}
        {command.shortcut && <Kbd>{formatShortcut(command.shortcut)}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
