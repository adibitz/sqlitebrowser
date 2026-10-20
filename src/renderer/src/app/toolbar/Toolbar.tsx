import { MoonIcon, PanelLeftIcon, SunIcon } from 'lucide-react'
import { CommandButton } from '@/components/CommandButton'
import { Separator } from '@/components/ui/separator'
import { useIsDark } from '@/lib/hooks/useIsDark'
import { cn } from '@/lib/cn'
import { useDbStore } from '@/store/db'
import { findCommand, type Command } from '../commands'
import { DatabaseMenu } from './DatabaseMenu'
import { OpenMenu } from './OpenMenu'
import { PaletteTrigger } from './PaletteTrigger'

/** Top bar (port of MainWindow._build_toolbar). */
export function Toolbar({ commands }: { commands: Command[] }) {
  const dirty = useDbStore((s) => s.state.dirty)
  const isOpen = useDbStore((s) => s.state.isOpen)
  const isDark = useIsDark()
  const cmd = (id: string): Command => findCommand(commands, id)
  const themeCommand = { ...cmd('view.theme'), icon: isDark ? SunIcon : MoonIcon }

  return (
    <header
      className="flex h-12 items-center gap-1 border-b bg-background px-2"
      role="toolbar"
      aria-label="Main"
    >
      <DatabaseMenu commands={commands} />
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <OpenMenu command={cmd('db.open')} />
      <CommandButton command={cmd('db.new')} label="New" />
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <CommandButton
        command={cmd('db.write')}
        label="Write changes"
        variant={dirty ? 'secondary' : 'ghost'}
        className={cn(dirty && 'bg-warning-tint text-warning-ink hover:bg-warning-tint/80')}
      />
      <CommandButton command={cmd('db.revert')} label="Revert" />
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <CommandButton command={cmd('sql.new')} label="SQL" />
      <div className="flex flex-1 justify-center px-4">
        <PaletteTrigger />
      </div>
      {isOpen && <CommandButton command={{ ...cmd('view.explorer'), icon: PanelLeftIcon }} iconOnly />}
      {isOpen && cmd('view.chat').enabled && <CommandButton command={cmd('view.chat')} iconOnly />}
      {isOpen && <CommandButton command={cmd('view.plot')} iconOnly />}
      {isOpen && <CommandButton command={cmd('view.log')} iconOnly />}
      <CommandButton command={themeCommand} iconOnly />
      <CommandButton command={cmd('app.preferences')} iconOnly />
    </header>
  )
}
