import { motion } from 'motion/react'
import { DatabaseIcon } from 'lucide-react'
import { fastTransition } from '@/lib/motion'

/** Shown while a file is dragged over the window. */
export function DropOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fastTransition}
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-[4px]"
    >
      <div className="flex items-center gap-3 rounded-panel bg-card px-6 py-4 shadow-float">
        <DatabaseIcon className="size-5 text-signal" />
        <span className="font-medium">Drop to open the database</span>
      </div>
    </motion.div>
  )
}
