import { useEffect } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { useSetting, useSettingsStore } from '@/store/settings'
import { AppShell } from './AppShell'
import { StartupError } from './StartupError'
import { useThemeClass } from './useThemeClass'

export function App() {
  const settings = useSettingsStore((s) => s.settings)
  const loadError = useSettingsStore((s) => s.loadError)
  const load = useSettingsStore((s) => s.load)
  const theme = useSetting('General/theme')

  useThemeClass(theme)
  useEffect(() => {
    void load()
  }, [load])

  if (loadError) return <StartupError message={loadError} onRetry={load} />
  if (!settings) return null

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        {settings['General/onboarded'] ? <AppShell key="shell" /> : <OnboardingFlow key="onboarding" />}
      </AnimatePresence>
    </MotionConfig>
  )
}
