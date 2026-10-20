import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Wordmark } from '@/components/brand/Wordmark'
import { fadeRise } from '@/lib/motion'
import { AiStep } from './AiStep'
import { ThemeStep } from './ThemeStep'

const STEP_COUNT = 2

/** First-launch questions: only what the app needs before it can start. */
export function OnboardingFlow() {
  const [step, setStep] = useState(0)

  return (
    <motion.main
      variants={fadeRise}
      initial="initial"
      animate="animate"
      exit="exit"
      className="grid h-full place-items-center overflow-y-auto p-6"
    >
      <div className="flex w-full max-w-120 flex-col gap-6">
        <header className="flex items-baseline justify-between">
          <Wordmark />
          <span className="text-micro text-muted-foreground tabular-nums">
            Step {step + 1} of {STEP_COUNT}
          </span>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} variants={fadeRise} initial="initial" animate="animate" exit="exit">
            {step === 0 ? <ThemeStep onNext={() => setStep(1)} /> : <AiStep onBack={() => setStep(0)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.main>
  )
}
