import type { Transition, Variants } from 'motion/react'

/** Expo-out, the easing for every entrance (DESIGN.md motion.ease-out-expo). */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

/** Seconds. Kept short on purpose: this is a work tool, motion only confirms a change. */
export const DURATION = {
  instant: 0.12, // press, hover
  fast: 0.16, // menus, tooltips, toasts
  base: 0.2, // dialogs, panels, onboarding steps (the maximum)
} as const

export const fastTransition: Transition = { duration: DURATION.fast, ease: EASE_OUT_EXPO }
export const baseTransition: Transition = { duration: DURATION.base, ease: EASE_OUT_EXPO }

/** Fade with a small rise; used for panels and steps that enter and leave. */
export const fadeRise: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: -4, transition: fastTransition },
}
