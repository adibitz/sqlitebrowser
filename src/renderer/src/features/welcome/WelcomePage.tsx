import { motion } from 'motion/react'
import type { Command } from '@/app/commands'
import { Wordmark } from '@/components/brand/Wordmark'
import { Kbd } from '@/components/ui/kbd'
import { fadeRise } from '@/lib/motion'
import { formatShortcut } from '@/lib/shortcuts'
import { useDbStore } from '@/store/db'
import { useUiStore } from '@/store/ui'
import { AppVersion } from './AppVersion'
import { RecentList } from './RecentList'
import { StartTiles } from './StartTiles'

/** Start page while no database is open (port of reference/sqliteview/ui/welcome.py). */
export function WelcomePage({ commands }: { commands: Command[] }) {
  const recent = useDbStore((s) => s.recent)
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)

  return (
    <motion.main
      variants={fadeRise}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full overflow-y-auto"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-1">
          <Wordmark />
          <h1 className="text-title font-medium">Open, browse, edit and query SQLite databases</h1>
        </header>
        <StartTiles commands={commands} />
        <section className="flex flex-col gap-2">
          <h2 className="text-label font-medium text-muted-foreground">Recent</h2>
          <RecentList files={recent} />
        </section>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-fit items-center gap-2 text-muted-foreground underline-offset-4 outline-none hover:text-signal hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Search commands, tables and columns with <Kbd>{formatShortcut('Mod+K')}</Kbd>
        </button>
        <AppVersion />
      </div>
    </motion.main>
  )
}
