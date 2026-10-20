---
version: alpha
name: Postessia
description: Calm monochrome marketing system with one blue signal accent. DM Sans at 400/500/800, fully rounded buttons with small radii everywhere else, two first-class themes (light and dark), GSAP scroll choreography.
colors:
  # Light theme (default)
  primary: "#141412"
  on-primary: "#FCFCFA"
  canvas: "#F5F5F3"
  surface-1: "#FCFCFA"
  surface-2: "#ECECE9"
  surface-3: "#E2E2DE"
  ink: "#141412"
  on-ink: "#FCFCFA"
  ink-muted: "#5F5E5A"
  hairline: "rgba(20, 20, 18, 0.09)"
  hairline-strong: "rgba(20, 20, 18, 0.16)"
  signal: "#1A66D1"
  on-signal: "#FCFCFA"
  signal-tint: "#DDE7F8"
  signal-ink: "#1452AD"
  success: "#1F8A52"
  success-tint: "#DBE8E0"
  success-ink: "#17663D"
  warning: "#A86200"
  warning-tint: "#ECE3D6"
  warning-ink: "#7A4700"
  destructive: "#C8362D"
  destructive-tint: "#F0DEDB"
  destructive-ink: "#9E2A23"
  # Dark theme
  dark-primary: "#F4F4F1"
  dark-on-primary: "#0E0E0D"
  dark-canvas: "#0E0E0D"
  dark-surface-1: "#181817"
  dark-surface-2: "#222220"
  dark-surface-3: "#2C2C2A"
  dark-ink: "#F4F4F1"
  dark-on-ink: "#0E0E0D"
  dark-ink-muted: "#A1A09B"
  dark-hairline: "rgba(244, 244, 241, 0.10)"
  dark-hairline-strong: "rgba(244, 244, 241, 0.16)"
  dark-signal: "#5B9DFF"
  dark-on-signal: "#0E0E0D"
  dark-signal-tint: "#14203A"
  dark-signal-ink: "#5B9DFF"
  dark-success: "#5BC88A"
  dark-success-tint: "#17241C"
  dark-warning: "#E5A54B"
  dark-warning-tint: "#282014"
  dark-destructive: "#F2635A"
  dark-destructive-tint: "#291816"
  # Gradient family (theme-independent; gradient cards only)
  gradient-violet: "#7B5CFF"
  gradient-violet-start: "#5B3DF5"
  gradient-violet-end: "#B49CFF"
  gradient-violet-deep: "#24127A"
  gradient-magenta: "#E0399B"
  gradient-magenta-start: "#C2187A"
  gradient-magenta-end: "#FF7CC8"
  gradient-magenta-deep: "#5C0838"
  gradient-orange: "#FF7A2E"
  gradient-orange-start: "#F2541B"
  gradient-orange-end: "#FFB86B"
  gradient-orange-deep: "#6E2106"
  gradient-coral: "#FF6B7F"
  gradient-coral-start: "#F2445F"
  gradient-coral-end: "#FFB3A1"
  gradient-coral-deep: "#6E1424"
  on-gradient: "#FCFCFA"
typography:
  # Display sizes step down at breakpoints: base (desktop >= 64rem), -md (48rem-64rem), -sm (< 48rem)
  display-xl:
    fontFamily: DM Sans
    fontSize: 5.5rem
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.045em
  display-xl-md:
    fontFamily: DM Sans
    fontSize: 4rem
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.045em
  display-xl-sm:
    fontFamily: DM Sans
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.04em
  display-lg:
    fontFamily: DM Sans
    fontSize: 4rem
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: -0.04em
  display-lg-md:
    fontFamily: DM Sans
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: -0.04em
  display-lg-sm:
    fontFamily: DM Sans
    fontSize: 2.75rem
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: -0.035em
  display-md:
    fontFamily: DM Sans
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.03em
  display-md-md:
    fontFamily: DM Sans
    fontSize: 2.75rem
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.03em
  display-md-sm:
    fontFamily: DM Sans
    fontSize: 2.5rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.025em
  display-sm:
    fontFamily: DM Sans
    fontSize: 2.75rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.025em
  display-sm-md:
    fontFamily: DM Sans
    fontSize: 2.5rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.025em
  display-sm-sm:
    fontFamily: DM Sans
    fontSize: 2.25rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.025em
  headline:
    fontFamily: DM Sans
    fontSize: 1.75rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.02em
  body-lg:
    fontFamily: DM Sans
    fontSize: 1.375rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: -0.01em
  body:
    fontFamily: DM Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label:
    fontFamily: DM Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.005em
  caption:
    fontFamily: DM Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.005em
  micro:
    fontFamily: DM Sans
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.01em
  button:
    fontFamily: DM Sans
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0em
  button-xs:
    fontFamily: DM Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.01em
  button-sm:
    fontFamily: DM Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0em
  accent-800:
    fontFamily: DM Sans
    fontSize: 1em
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.05em
  wordmark:
    fontFamily: DM Sans
    fontSize: 1.25rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.04em
  figure:
    fontFamily: DM Sans
    fontSize: 3rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.045em
    fontFeature: '"tnum" 1'
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  control: 6px
  field: 10px
  card: 8px
  panel: 10px
  full: 9999px
spacing:
  unit: 4px
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  section: 96px
  section-lg: 128px
  gutter-sm: 16px
  gutter-md: 24px
  gutter-lg: 32px
  container: 1200px
  nav-height: 64px
  field-height: 44px
  touch-min: 44px
  measure: 60ch
  hero-top-max: 96px
  anchor-offset: 80px
  reveal-distance: 2rem
  icon-sm: 14px
  icon-md: 16px
  icon-lg: 20px
  icon-stroke: 1.75
  avatar: 40px
  checkbox: 18px
  switch-width: 40px
  switch-height: 24px
breakpoints:
  sm: 40rem
  md: 48rem
  lg: 64rem
  xl: 80rem
elevation:
  flat: none
  float: "0 1px 2px rgba(20, 20, 18, 0.05), 0 16px 40px -16px rgba(20, 20, 18, 0.18)"
  modal: "0 32px 80px -24px rgba(20, 20, 18, 0.28)"
  dark-float: "inset 0 1px 0 rgba(244, 244, 241, 0.06), 0 20px 48px -20px rgba(0, 0, 0, 0.7)"
  dark-modal: "inset 0 1px 0 rgba(244, 244, 241, 0.08), 0 40px 96px -24px rgba(0, 0, 0, 0.8)"
  subtle: "0 1px 2px rgba(20, 20, 18, 0.05), 0 2px 8px -2px rgba(20, 20, 18, 0.06)"
  dark-subtle: "0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px -4px rgba(0, 0, 0, 0.35)"
  soft: "0 1px 2px rgba(20, 20, 18, 0.06), 0 8px 24px -6px rgba(20, 20, 18, 0.16), 0 24px 48px -16px rgba(20, 20, 18, 0.12)"
  dark-soft: "0 8px 24px -8px rgba(0, 0, 0, 0.5), 0 24px 56px -20px rgba(0, 0, 0, 0.55)"
  focus-ring: "0 0 0 2px {colors.canvas}, 0 0 0 4px {colors.signal}"
  dark-focus-ring: "0 0 0 2px {colors.dark-canvas}, 0 0 0 4px {colors.dark-signal}"
backdrop:
  nav-opacity: 0.8
  nav-blur: 12px
  dialog-opacity: 0.6
  dialog-blur: 4px
opacity:
  disabled: 0.5
  tint: 0.12
  gradient-grain: 0.06
  hover-mix: 0.14
  scrub-dim: 0.15
motion:
  duration-instant: 120ms
  duration-fast: 200ms
  duration-base: 400ms
  duration-slow: 700ms
  duration-reveal: 1000ms
  ease-out-expo: "cubic-bezier(0.16, 1, 0.3, 1)"
  ease-in-out-quart: "cubic-bezier(0.65, 0, 0.35, 1)"
  ease-scrub: none
  gsap-ease-out: expo.out
  gsap-ease-in-out: power3.inOut
  stagger: 0.08s
  batch-interval: 0.1s
  reveal-distance: 2rem
  reveal-start: top 85%
  press-scale: 0.97
  press-duration-in: 100ms
  press-duration-out: 200ms
  icon-swap-scale: 0.25
  icon-swap-blur: 4px
  icon-swap-duration: 200ms
  arrow-nudge: 2px
  optical-trim: 4px
  hover-lift: -2px
  smooth: 1.1
  smooth-touch: 0.12
  parallax-min: 0.9
  parallax-max: 1.1
  marquee-duration: 40s
  scrub-text: 0.5
gradients:
  # Light source in the top-right corner, settling into the deep stop bottom-left where text sits.
  violet: "radial-gradient(120% 120% at 100% 0%, {colors.gradient-violet-end} 0%, {colors.gradient-violet-start} 38%, {colors.gradient-violet-deep} 82%)"
  magenta: "radial-gradient(120% 120% at 100% 0%, {colors.gradient-magenta-end} 0%, {colors.gradient-magenta-start} 38%, {colors.gradient-magenta-deep} 82%)"
  orange: "radial-gradient(120% 120% at 100% 0%, {colors.gradient-orange-end} 0%, {colors.gradient-orange-start} 38%, {colors.gradient-orange-deep} 82%)"
  coral: "radial-gradient(120% 120% at 100% 0%, {colors.gradient-coral-end} 0%, {colors.gradient-coral-start} 38%, {colors.gradient-coral-deep} 82%)"
  skeleton-shimmer: "linear-gradient(90deg, transparent 0%, rgba(20, 20, 18, 0.06) 50%, transparent 100%)"
  dark-skeleton-shimmer: "linear-gradient(90deg, transparent 0%, rgba(244, 244, 241, 0.06) 50%, transparent 100%)"
z-index:
  base: 0
  raised: 10
  nav: 40
  overlay: 50
  toast: 60
components:
  # Buttons (always rounded.full)
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  page-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
  text-muted-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink-muted}"
    typography: "{typography.body}"
  divider:
    backgroundColor: "{colors.hairline}"
    height: 1px
  divider-strong:
    backgroundColor: "{colors.hairline-strong}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.dark-hairline}"
    height: 1px
  divider-strong-dark:
    backgroundColor: "{colors.dark-hairline-strong}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  button-secondary-dark:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-ghost:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 16px
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-signal-dark:
    backgroundColor: "{colors.dark-signal}"
    textColor: "{colors.dark-on-signal}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  button-link:
    textColor: "{colors.signal}"
    typography: "{typography.button}"
  button-xs:
    typography: "{typography.button-xs}"
    rounded: "{rounded.full}"
    height: 28px
    padding: 12px
  button-sm:
    typography: "{typography.button-sm}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 16px
  button-lg:
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: 52px
    padding: 28px
  button-icon:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 44px
  # Badges
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
    height: 24px
    padding: 10px
  badge-signal:
    backgroundColor: "{colors.signal-tint}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
    height: 24px
    padding: 10px
  badge-signal-dark:
    backgroundColor: "{colors.dark-signal-tint}"
    textColor: "{colors.dark-signal-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-success:
    backgroundColor: "{colors.success-tint}"
    textColor: "{colors.success-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-success-dark:
    backgroundColor: "{colors.dark-success-tint}"
    textColor: "{colors.dark-success}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-warning-dark:
    backgroundColor: "{colors.dark-warning-tint}"
    textColor: "{colors.dark-warning}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-destructive:
    backgroundColor: "{colors.destructive-tint}"
    textColor: "{colors.destructive-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  badge-destructive-dark:
    backgroundColor: "{colors.dark-destructive-tint}"
    textColor: "{colors.dark-destructive}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
  status-success:
    textColor: "{colors.success}"
  status-warning:
    textColor: "{colors.warning}"
  # Cards
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: 24px
  card-dark:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: 24px
  card-featured:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 32px
  card-featured-dark:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.card}"
    padding: 32px
  card-inverse:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: 24px
  card-inverse-dark:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: 24px
  card-floating:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 16px
  gradient-card-violet:
    backgroundColor: "{colors.gradient-violet-deep}"
    textColor: "{colors.on-gradient}"
    typography: "{typography.display-md}"
    rounded: "{rounded.panel}"
    padding: 32px
  gradient-card-magenta:
    backgroundColor: "{colors.gradient-magenta-deep}"
    textColor: "{colors.on-gradient}"
    typography: "{typography.display-md}"
    rounded: "{rounded.panel}"
    padding: 32px
  gradient-card-orange:
    backgroundColor: "{colors.gradient-orange-deep}"
    textColor: "{colors.on-gradient}"
    typography: "{typography.display-md}"
    rounded: "{rounded.panel}"
    padding: 32px
  gradient-card-coral:
    backgroundColor: "{colors.gradient-coral-deep}"
    textColor: "{colors.on-gradient}"
    typography: "{typography.display-md}"
    rounded: "{rounded.panel}"
    padding: 32px
  gradient-swatch-violet:
    backgroundColor: "{colors.gradient-violet}"
    rounded: "{rounded.card}"
  gradient-swatch-magenta:
    backgroundColor: "{colors.gradient-magenta}"
    rounded: "{rounded.card}"
  gradient-swatch-orange:
    backgroundColor: "{colors.gradient-orange}"
    rounded: "{rounded.card}"
  gradient-swatch-coral:
    backgroundColor: "{colors.gradient-coral}"
    rounded: "{rounded.card}"
  gradient-stop-violet-start:
    backgroundColor: "{colors.gradient-violet-start}"
  gradient-stop-violet-end:
    backgroundColor: "{colors.gradient-violet-end}"
  gradient-stop-magenta-start:
    backgroundColor: "{colors.gradient-magenta-start}"
  gradient-stop-magenta-end:
    backgroundColor: "{colors.gradient-magenta-end}"
  gradient-stop-orange-start:
    backgroundColor: "{colors.gradient-orange-start}"
  gradient-stop-orange-end:
    backgroundColor: "{colors.gradient-orange-end}"
  gradient-stop-coral-start:
    backgroundColor: "{colors.gradient-coral-start}"
  gradient-stop-coral-end:
    backgroundColor: "{colors.gradient-coral-end}"
  button-on-gradient:
    backgroundColor: "{colors.on-gradient}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 20px
  card-title:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
  card-description:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
  # Forms
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 44px
    padding: 14px
  text-input-dark:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 44px
    padding: 14px
  textarea:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 112px
    padding: 14px
  field-label:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  field-hint:
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
  field-error:
    textColor: "{colors.destructive}"
    typography: "{typography.micro}"
  checkbox:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.xs}"
    size: 18px
  checkbox-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.xs}"
    size: 18px
  switch-track:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.full}"
    width: 40px
    height: 24px
  switch-track-checked:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
    width: 40px
    height: 24px
  select-trigger:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 44px
    padding: 14px
  native-select:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 44px
    padding: 14px
  input-group:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: 44px
  input-group-addon:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    padding: 14px
  radio:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.full}"
    size: 18px
  radio-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.full}"
    size: 18px
  choice-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 16px
  choice-card-checked:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 16px
  otp-slot:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.field}"
    size: 44px
  slider-track:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.full}"
    height: 6px
  slider-range:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 6px
  slider-thumb:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.full}"
    size: 20px
  toggle:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: 44px
    padding: 14px
  toggle-pressed:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: 44px
  # Navigation and disclosure
  tabs-list:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    height: 44px
    padding: 4px
  tabs-trigger-active:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.sm}"
  tabs-trigger-active-dark:
    backgroundColor: "{colors.dark-surface-3}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.sm}"
  accordion-trigger:
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    padding: 20px
  accordion-content:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-sm}"
    height: 64px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    padding: 64px
  # Overlays
  dialog:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: 32px
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  tooltip-dark:
    backgroundColor: "{colors.dark-ink}"
    textColor: "{colors.dark-on-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  avatar:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    size: 40px
  skeleton:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.sm}"
---

# Design System: Postessia

> **This file is self-contained and normative.** Every token is in the YAML front matter above, and the prose explains how to apply it. Code mirrors these values, but this document is the source of truth.
>
> **Design read:** SaaS landing page for content teams, with a calm monochrome language and one blue signal accent, leaning toward shadcn/ui (Base UI) + Tailwind v4 + GSAP.
>
> **Dials:** Design variance 7 (asymmetric splits, offset grids). Motion intensity 7 (scroll choreography, smooth scroll). Visual density 4 (airy marketing spacing).
>
> **Units:** every font size is in `rem`, every letter-spacing is in `em`, line heights are unitless multipliers.

## Overview

Postessia reads like a **quiet, well-lit studio**: a soft neutral canvas, near-black ink, and one confident warm accent that only appears where the eye should land. The atmosphere is **calm, editorial and assured**. Each band of the page carries one statement, set large in DM Sans with tight tracking, followed by plenty of breathing room.

The system is **monochrome first**. Hierarchy comes from size, tracking and surface lift. Weight and color do very little of the work. The single chromatic voice is **Signal Blue** (`{colors.signal}`). It is used sparingly for links, focus, the selected state, and one emphasised word or figure. Most of the decoration is real product UI: post previews, calendars and channel marks. There is no decorative illustration.

The system ships in **two first-class themes**. **Light** is a soft daylight studio. **Dark** is the same room at night: a warm near-black canvas with off-white ink. Neither theme is derived from the other; both are tuned for WCAG AA (AAA for body). A page picks ONE theme and keeps it in every section.

**Key characteristics**

- Soft neutral canvas with a faint warm cast. No pure `#000` and no pure `#fff` anywhere.
- One accent, Signal Blue, which is never a section background and never a gradient wash.
- DM Sans at three weights only: 400, 500 and a rare 800.
- Display type pulled tight (-0.04em) and short: headlines max 2 lines.
- Buttons are fully rounded pills; everything else uses small, restrained radii (2px to 10px), with fields at the softest 10px.
- Cards separate by surface lift and soft shadow, not borders; fields have no shadow and turn their border accent on focus.
- Motion supports reading order: content rises into place as it is reached, and scroll is smoothed. Every animation has a stated purpose.

### Themes

Every color token has a light value (`{colors.canvas}`) and a dark value with a `dark-` prefix (`{colors.dark-canvas}`). Components are specified in light; the dark entry (`-dark` suffix) is listed where the mapping is not a straight token swap. Otherwise apply the rule: **replace each `colors.X` with `colors.dark-X`**.

| Semantic role                            | Light                        | Dark                              |
| ---------------------------------------- | ---------------------------- | --------------------------------- |
| Page background                          | `{colors.canvas}` #F5F5F3    | `{colors.dark-canvas}` #0E0E0D    |
| Card / input / popover                   | `{colors.surface-1}` #FCFCFA | `{colors.dark-surface-1}` #181817 |
| Secondary fill, featured card, tab track | `{colors.surface-2}` #ECECE9 | `{colors.dark-surface-2}` #222220 |
| Hover on surface-2, active tab (dark)    | `{colors.surface-3}` #E2E2DE | `{colors.dark-surface-3}` #2C2C2A |
| Primary text, primary pill fill          | `{colors.ink}` #141412       | `{colors.dark-ink}` #F4F4F1       |
| Label on primary pill                    | `{colors.on-ink}` #FCFCFA    | `{colors.dark-on-ink}` #0E0E0D    |
| Secondary text                           | `{colors.ink-muted}` #5F5E5A | `{colors.dark-ink-muted}` #A1A09B |
| Accent                                   | `{colors.signal}` #1A66D1    | `{colors.dark-signal}` #5B9DFF    |

Implementation: tokens are CSS custom properties on `:root` (light) and `.dark` (dark). The theme class sits on `<html>`, so portalled overlays (dialogs, tooltips, selects) inherit it. Respect `prefers-color-scheme` when a page does not pin a theme.

## Colors

The palette is rooted in warm-neutral greys with a single blue signal. Each color has one job.

### Foundation (surfaces)

- **Daylight Fog** (`{colors.canvas}` #F5F5F3 / **Night Studio** `{colors.dark-canvas}` #0E0E0D): the page background in every section. It is softer than white by day and warmer than black by night. It is the room everything sits in.
- **Paper Lift** (`{colors.surface-1}` #FCFCFA / **Charcoal Lift** `{colors.dark-surface-1}` #181817): one step above canvas. Used for cards, inputs and popovers. Cards sit on it borderless; inputs and popovers add a hairline edge.
- **Pebble** (`{colors.surface-2}` #ECECE9 / **Smoke** `{colors.dark-surface-2}` #222220): two steps up. Used for secondary buttons, the tab track, and featured pricing.
- **Stone** (`{colors.surface-3}` #E2E2DE / **Ash** `{colors.dark-surface-3}` #2C2C2A): the pressed and hover step on Pebble, and the active tab thumb in dark.

### Ink (text)

- **Graphite Ink** (`{colors.ink}` #141412 / **Bone White** `{colors.dark-ink}` #F4F4F1): headlines, body and the primary pill fill. Contrast on canvas is 17.6:1 in light and 17.9:1 in dark.
- **Paper** (`{colors.on-ink}` / `{colors.dark-on-ink}`): the label color on the primary pill, which always inverts against ink.
- **Warm Slate** (`{colors.ink-muted}` #5F5E5A / **Fog Grey** `{colors.dark-ink-muted}` #A1A09B): secondary copy, meta, placeholders and footer links. Contrast is 6.2:1 in light and 7.4:1 in dark. Text hierarchy is **binary**: ink or ink-muted, with no third grey.

### Structure

- **Graphite Hairline** (`{colors.hairline}` 9% / `{colors.dark-hairline}` 10%): dividers, ghost and floating card edges. It is felt more than seen.
- **Graphite Hairline Strong** (`{colors.hairline-strong}` 16% / `{colors.dark-hairline-strong}` 16%): input strokes and outline buttons, where the edge must be findable.

### Signal (the only accent)

- **Signal Blue** (`{colors.signal}` #1A66D1 deep, 5.0:1 on canvas / `{colors.dark-signal}` #5B9DFF lit, 7.1:1 on dark canvas): links, the focus ring, selected marks, and one emphasised word or figure.
- **On Signal** (`{colors.on-signal}` #FCFCFA / `{colors.dark-on-signal}` #0E0E0D): text placed on a Signal fill. It flips per theme to hold AA contrast.
- **Signal Tint** (`{colors.signal-tint}` #DDE7F8 / `{colors.dark-signal-tint}` #14203A): the background for signal badges and the selected-row tint, with **Signal Ink** (`{colors.signal-ink}` #1452AD / `{colors.dark-signal-ink}` #5B9DFF) as the label on it (5.9:1 in both themes).

### Semantic states (UI feedback only)

- **Moss** (`{colors.success}` #1F8A52 / **Mint Moss** `{colors.dark-success}` #5BC88A): published, scheduled, saved.
- **Amber Ochre** (`{colors.warning}` #A86200 / **Honey** `{colors.dark-warning}` #E5A54B): needs review.
- **Brick** (`{colors.destructive}` #C8362D / **Coral Brick** `{colors.dark-destructive}` #F2635A): errors and destructive actions.

### Gradient family (signature, gradient cards only)

The rhythm break carried over from the original spec: every few sections, one **vibrant gradient atmosphere card** drops into an otherwise monochrome grid, like a small living poster. These tokens are **theme-independent**, so the same card glows on Daylight Fog and on Night Studio.

- **Ultraviolet** (`{colors.gradient-violet}` #7B5CFF; stops `-start` #5B3DF5, `-end` #B49CFF, `-deep` #24127A): the most common variant.
- **Orchid Magenta** (`{colors.gradient-magenta}` #E0399B; stops #C2187A, #FF7CC8, deep #5C0838): a hot pink poster.
- **Sunset Orange** (`{colors.gradient-orange}` #FF7A2E; stops #F2541B, #FFB86B, deep #6E2106): a warm wash.
- **Coral Bloom** (`{colors.gradient-coral}` #FF6B7F; stops #F2445F, #FFB3A1, deep #6E1424): a soft coral and pink panel.
- **On Gradient** (`{colors.on-gradient}` #FCFCFA): text and the inverted pill on every gradient card, in both themes.

**Recipe** (`{gradients.violet}` etc.): a radial light source from the top-right corner, starting at `-end`, passing through `-start` at 38% and settling into `-deep` by 82%. Text and CTAs always sit bottom-left, on the deep stop, which keeps On Gradient above 9:1 contrast. A 6% film grain (`{opacity.gradient-grain}`) on a fixed pseudo-element is optional.

**Gradient rules:** **one gradient card per section, at most.** A long page may use the whole family (up to four), as long as every gradient card lives in its own section and at least one neutral section sits between any two of them, so two never share a viewport. Never put two gradient cards in the same grid or side by side, which reads as a moodboard. Gradients are **cards, never section backgrounds**, never buttons, never text fills. Gradient direction is fixed across breakpoints. A gradient card may also act as a panel framing a real product preview (for example the hero post preview), as long as it carries no text of its own.

### Color rules

- **One accent, locked.** Signal is the only chromatic UI color on a page. The gradient family is decoration for gradient cards only, and semantic colors appear only in real UI states.
- **Signal is a signal.** It is never a section background, a wash behind a button, or a glow.
- **Lift, not tint.** Containers step up canvas, then surface-1, then surface-2. Do not use opacity on text for hierarchy.
- **Theme lock.** A page is light or dark from top to bottom.
- **Banned:** glow effects (gradient halos behind buttons, neon outer glows), gradient text, gradient section backgrounds, beige+brass "premium craft" palettes, pure `#000000` / `#FFFFFF`.

## Typography

**Typeface: DM Sans** for everything: display, body, UI and numerals. It is a geometric grotesque with soft terminals: friendly at body sizes, confident when tightened at display sizes. Load weights **400, 500 and 800** only, with `font-display: swap`. Use tabular figures (`"tnum"`) for prices, times and counts.

### Weight discipline

| Weight            | Role                                                                                                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **400 Regular**   | All body copy, descriptions, inputs, micro text                                                                                                                                                                                                       |
| **500 Medium**    | Display headlines, card titles, buttons, labels, nav, captions                                                                                                                                                                                        |
| **800 ExtraBold** | **Rare.** At most one use per viewport: the wordmark (`{typography.wordmark}`), one emphasised word inside a hero headline (`{typography.accent-800}`), or a hero price figure (`{typography.figure}`). Never a full sentence, body copy, or a button |

No other weights exist (no 300, 600 or 700). Hierarchy is carried by **size and tracking**: display sits at 500, which reads calmer and more editorial than a heavy ramp.

### Scale

All sizes are rem; all tracking is em. Display sizes step down at the `md` (48rem) and `lg` (64rem) breakpoints.

| Token               | < 48rem   | 48rem to 64rem | >= 64rem | Weight | Line height | Tracking | Use                                                 |
| ------------------- | --------- | -------------- | -------- | ------ | ----------- | -------- | --------------------------------------------------- |
| `display-xl`        | 3rem      | 4rem           | 5.5rem   | 500    | 0.98        | -0.045em | Hero headline, max 2 lines                          |
| `display-lg`        | 2.75rem   | 3rem           | 4rem     | 500    | 1.02        | -0.04em  | Section openers                                     |
| `display-md`        | 2.5rem    | 2.75rem        | 3rem     | 500    | 1.1         | -0.03em  | Sub-sections, final CTA, gradient cards             |
| `display-sm`        | 2.25rem   | 2.5rem         | 2.75rem  | 500    | 1.15        | -0.025em | Compact section openers (FAQ), large card headlines |
| `headline`          | 1.75rem   |                |          | 500    | 1.2         | -0.02em  | Card titles, tier names                             |
| `body-lg`           | 1.375rem  |                |          | 400    | 1.45        | -0.01em  | Hero subtext, lead copy, accordion trigger (500)    |
| `body`              | 1rem      |                |          | 400    | 1.6         | 0em      | Default body, inputs (prevents iOS zoom)            |
| `body-sm`           | 0.875rem  |                |          | 400    | 1.5         | 0em      | Card descriptions, dense UI                         |
| `label` / `caption` | 0.8125rem |                |          | 500    | 1.4         | 0.005em  | Field labels, meta, footer links                    |
| `micro`             | 0.75rem   |                |          | 400    | 1.4         | 0.01em   | Badges, helper text, legal                          |
| `button`            | 0.9375rem |                |          | 500    | 1           | 0em      | Default and large buttons                           |
| `button-sm`         | 0.875rem  |                |          | 500    | 1           | 0em      | Small buttons, nav links, tabs                      |
| `button-xs`         | 0.75rem   |                |          | 500    | 1           | 0.01em   | Extra-small buttons in toolbars and filters         |
| `figure`            | 3rem      |                |          | 800    | 1           | -0.045em | The one hero price figure, tabular                  |
| `wordmark`          | 1.25rem   |                |          | 800    | 1           | -0.04em  | The Postessia wordmark                              |

### Principles

- **Tracking tightens as size grows.** Display sizes pull to -0.04em. Body sits at 0em. Never track body text open.
- **Short headlines.** At most 8 words for section headlines and 2 lines for the hero. If a headline wraps to 3 lines, step the size down; do not widen the column.
- **Readable measure.** Body paragraphs cap at `{spacing.measure}` (60ch).
- **Emphasis stays in the family.** Emphasise a word with 800 or with Signal color, never with a second typeface or decorative italics.
- **Eyebrows are rationed.** Small uppercase labels are allowed at most once per three sections.
- **Punctuation:** no em-dashes or en-dash separators in UI copy. Use a period, comma, colon or hyphen.

## Layout

### Spacing

A **4px base unit** (`{spacing.unit}`). Steps: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

- **Section rhythm:** `{spacing.section}` 96px vertical on mobile, `{spacing.section-lg}` 128px from 48rem up. A neutral section sitting between two gradient sections may take 160px (`md:py-40`) so the gradient cards never share a viewport.
- **Hero top padding:** at most 96px below the nav, so the hero never floats mid-viewport.
- **Card padding:** `{spacing.lg}` 24px by default, `{spacing.xl}` 32px for featured and gradient cards.
- **Inside blocks:** label to field 8px, title to body 12px, body to CTA 32px.

### Grid and container

- Container: max `{spacing.container}` 1200px, centred, gutters `{spacing.gutter-sm}` 16px, then `{spacing.gutter-md}` 24px from 40rem, then `{spacing.gutter-lg}` 32px from 64rem.
- Breakpoints: `sm 40rem (640px)`, `md 48rem (768px)`, `lg 64rem (1024px)`, `xl 80rem (1280px)`.
- 12-column CSS Grid on desktop. **Asymmetry is the default:** hero 7/5 split, bento with mixed spans, FAQ 4/8.
- **Every multi-column layout collapses to one column below 48rem**, declared in the same component.
- Use Grid for layout (never flex percentage math), and `min-height: 100dvh` (never `100vh`) for full-height sections.

### Whitespace philosophy

The canvas is the breathing room. Sections separate by space, not by background flips: a band of air, one statement, its proof, then air again. Density stays at "daily app" level: airy, never empty.

### Landing-page composition rules

- **Hero:** at most 4 text elements (optional eyebrow, a headline of 2 lines max, subtext of 20 words max, CTAs). No logo strips, pricing teasers or bullet lists inside the hero.
- No two sections share a layout family, and no three image/text zigzags in a row.
- No three equal feature cards; use a bento with an exact cell count and mixed spans.
- One CTA label per intent across the page ("Start free" for signup everywhere).
- Content per section: a headline of 8 words max, body of 25 words max, plus one visual or one CTA.
- Nav stays on one line at desktop, height `{spacing.nav-height}` 64px.

## Elevation & Depth

Depth comes from **surface lift first and shadow second**. Shadows are always tinted to the canvas hue; never use pure-black drops on light surfaces.

| Level       | Light                                                                                                                                                  | Dark                                                                                                                                                  | Use                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0 Flat      | none                                                                                                                                                   | none                                                                                                                                                  | Canvas type, rows, footer                                                                                                        |
| 1 Lift      | surface-1 + `{elevation.subtle}` `0 1px 2px rgba(20,20,18,0.05), 0 2px 8px -2px rgba(20,20,18,0.06)` (cards); surface-1 + 1px hairline-strong (inputs) | dark-surface-1 + `{elevation.dark-subtle}` `0 1px 2px rgba(0,0,0,0.4), 0 4px 12px -4px rgba(0,0,0,0.35)` (cards); + 1px dark-hairline-strong (inputs) | Default cards, inputs                                                                                                            |
| 2 Float     | `0 1px 2px rgba(20,20,18,0.05), 0 16px 40px -16px rgba(20,20,18,0.18)`                                                                                 | `inset 0 1px 0 rgba(244,244,241,0.06), 0 20px 48px -20px rgba(0,0,0,0.7)`                                                                             | Hero post previews, popovers, select menus                                                                                       |
| 3 Modal     | `0 32px 80px -24px rgba(20,20,18,0.28)`                                                                                                                | `inset 0 1px 0 rgba(244,244,241,0.08), 0 40px 96px -24px rgba(0,0,0,0.8)`                                                                             | Dialogs                                                                                                                          |
| Soft        | `0 1px 2px rgba(20,20,18,0.06), 0 8px 24px -6px rgba(20,20,18,0.16), 0 24px 48px -16px rgba(20,20,18,0.12)`                                            | `0 8px 24px -8px rgba(0,0,0,0.5), 0 24px 56px -20px rgba(0,0,0,0.55)`                                                                                 | Inverse cards. Wide and diffuse, so a dark card on a light page reads as lifted, not stamped                                     |
| Focus       | 2px solid signal ring, 2px offset                                                                                                                      | 2px solid dark-signal ring, 2px offset                                                                                                                | Keyboard focus on buttons, tabs, toggles, switches, checkboxes, radios, accordion triggers, links, linked cards. Never on fields |
| Field focus | border turns signal, **no ring and no shadow**                                                                                                         | border turns dark-signal                                                                                                                              | Inputs, textareas, selects, input groups, OTP cells                                                                              |

In dark mode, a 1px inner top highlight replaces most of the shadow work: light catching the top edge reads as lift.

**Backdrops:** the dialog backdrop is canvas at 60% with a 4px blur. The nav uses canvas at 80% with a 12px backdrop blur, and falls back to a solid canvas under `prefers-reduced-transparency`.

## Shapes

**Shape lock:** **buttons are always fully rounded. Everything else uses small, restrained radii.** Corners should soften an edge, never turn a surface into a blob. Nothing except buttons (and the circular avatar and switch track) goes above 10px: the system reads crisp and precise, with only the controls soft.

| Token               | Value  | Applies to                                                                                                                                                           |
| ------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{rounded.full}`    | 9999px | **Buttons only**: primary, secondary, outline, ghost, signal, on-gradient, icon buttons. Also the avatar circle and the switch track, which are circular by function |
| `{rounded.panel}`   | 10px   | The largest radius below full: gradient cards, dialogs, large media panels                                                                                           |
| `{rounded.card}`    | 8px    | Cards, image tiles, post previews, pricing cards                                                                                                                     |
| `{rounded.field}`   | 10px   | Inputs, textareas, native and custom select triggers and popups, input groups, OTP cells. Fields are the softest non-button surface, level with panels               |
| `{rounded.control}` | 6px    | Tab track, toggles and toggle groups, select menu items, small inset blocks inside cards                                                                             |
| `{rounded.sm}`      | 4px    | Badges, active tab thumb, tooltips, skeleton blocks, accordion icon chip, small thumbnails                                                                           |
| `{rounded.xs}`      | 2px    | Checkbox, inline code, tiny chips                                                                                                                                    |
| `{rounded.none}`    | 0px    | Full-bleed images only                                                                                                                                               |

**Nesting rule:** an inner radius equals the outer radius minus the gap between them (an 8px card with 4px padding holds 4px media), so nested corners stay concentric.

Never square off a button, never use a pill-shaped badge, card or tab, and never exceed 10px on a non-button surface.

## Components

All components are shadcn/ui (Base UI primitives) re-skinned to these tokens. Component tokens in the front matter give the resting values; the states below complete them.

### Buttons

- **Primary** (`{components.button-primary}` / `-dark`): ink pill with an inverted label. Use one per view. Hover mixes 14% canvas into the fill. Contrast is above 15:1 in both themes.
- **Secondary** (`{components.button-secondary}`): Pebble pill with an ink label, Stone on hover. Use it for the alternate path beside a primary.
- **Outline** (`{components.button-outline}`): transparent with a `hairline-strong` stroke and surface-2 on hover. Use it in dense UI and toolbars.
- **Ghost** (`{components.button-ghost}`): no fill until hover (surface-2). Use it for nav links and icon actions.
- **Signal** (`{components.button-signal}` / `-dark`): Signal pill with an on-signal label. **Rare:** once per page at most, for the single most important conversion moment.
- **Link** (`{components.button-link}`): Signal text with an underline at 4px offset on hover.
- **Destructive:** destructive at 10% fill with a destructive label.
- **Sizes:** xs 28px (`{components.button-xs}`, 0.75rem label, 14px icons), sm 36px, default 44px (the touch minimum), lg 52px, icon 44px circle, icon-sm 36px circle, icon-xs 28px circle. **xs and sm are desktop density only** (toolbars, table rows, inline filters); on touch screens use default or larger.
- **States:** 200ms color transition. Press scales to 0.97 (`{motion.press-scale}`), going down in 100ms and releasing over 200ms expo-out; no press scale under reduced motion. Focus uses the 2px signal ring. Disabled is 50% opacity with no pointer. Labels stay on one line, 3 words max.
- **Outline edge:** a flat 1px `hairline-strong` border with no shadow. On hover the border darkens to ink at 28% and a surface-2 fill fades in.
- **Optical alignment:** when a button has a leading or trailing icon, that side gets 4px less padding (`{motion.optical-trim}`), so the content looks centered rather than measures centered. Mark the icon with `data-icon="start"` (leading) or `data-icon="end"` / `"arrow"` (trailing); `IconSwap` sets this itself.
- **Contextual icons:** icons that change with state (copy to check, play to pause, like) cross-fade with opacity, scale from 0.25 and a 4px blur over 200ms (`IconSwap`). Labels that change keep a fixed width, and counts use tabular figures.
- **Directional nudge:** a trailing arrow marked `data-icon="arrow"` moves 2px toward its destination on hover.

### Badges

- `{components.badge}` is Pebble with an ink label, 4px corners (`{rounded.sm}`), never pill-shaped. `{components.badge-signal}` is a solid signal tint with a deeper signal-ink label. Success, warning and destructive follow the same recipe: a solid 12% tint behind a deeper ink color, so labels pass AA. There is also an outline variant with a `hairline-strong` stroke. A `solid` variant (ink fill, inverted label) marks a pinned or primary state. Badges are 24px tall in micro 500 with tabular figures. Badges describe real state and never sit on top of images.

### Cards and containers

- **Default** (`{components.card}`): surface-1, no border, and a small soft shadow (`{elevation.subtle}`): a 1px contact shadow plus a short 8px diffuse drop, just enough to lift it off the canvas without reading as floating.
- **Featured** (`{components.card-featured}`): surface-2, no border. The lift is one surface step, with no chromatic outline. Use it for the recommended pricing tier.
- **Floating** (`{components.card-floating}`): surface-1, 1px hairline, Elevation 2. Use it only for elements that sit above the page, such as hero post previews.
- **Ghost:** 1px hairline only, no fill. Use it for grouping inside other surfaces.
- **Border rule:** only floating and ghost cards carry a border. Default, featured, inverse and gradient cards have none; they separate by surface lift, color or shadow. Dividers inside a card (footer top line, image bottom line) are not card borders and stay.
- **Inverse** (`{components.card-inverse}` / `-dark`): the opposite theme scoped to one card. On a light page it is dark-surface-1 with dark-ink text, and on a dark page it is surface-1 with ink text. Everything inside (buttons, badges, muted text, hairlines) flips with it, because the opposite token set is applied to the card. No border; depth comes from `{elevation.soft}`, which follows the **page** theme, not the card. Use it for a short, high-contrast aside (a note, a report summary), one or two per page, never inside a grid of default cards where it would read as a selected state.
- **Gradient** (`{components.gradient-card-violet}`, `-magenta`, `-orange`, `-coral`): panel radius, 32px padding, `{gradients.*}` fill, On Gradient text at the bottom-left in display-md (display-sm when the card is a narrow grid cell), and an optional inverted pill CTA (`{components.button-on-gradient}`). No border and no shadow, because color saturation is the depth. One per section, with a neutral section between gradient cards.
- **Interactive (linked):** any variant with `interactive` lifts 2px on hover over 400ms expo-out, its border strengthens and it gains Elevation 2; no lift under reduced motion. Put one `CardLink` inside (usually in the title): its stretched hit area covers the whole card while staying a real link, and keyboard focus rings the card. Any other control inside needs `relative z-10` to stay clickable. Reference: `/ui/card`.
- Title uses `{components.card-title}` and description uses `{components.card-description}`. **Use cards only when elevation means something**; otherwise group with spacing or a single top border.

### Inputs and forms

- **Text input** (`{components.text-input}` / `-dark`): surface-1 fill, 1px `hairline-strong` stroke, 10px corners (`{rounded.field}`), 44px tall, 16px text, ink-muted placeholder. Hover strengthens the stroke to ink at 28%.
- **Focus:** the border turns Signal (`{colors.signal}` / `{colors.dark-signal}`). **No ring, no glow, no shadow** on any field state; the accent border alone marks focus (signal is 5.0:1 on canvas in light and 7.1:1 in dark, so the change stays visible).
- **Invalid:** the border switches to destructive, again with no ring. The error (`{components.field-error}`) sits **below** the field.
- **Label** (`{components.field-label}`): always **above** the field, 8px gap. The placeholder is never the label. Helper text (`{components.field-hint}`, rendered with `FieldDescription`) goes below.
- **Textarea** (`{components.textarea}`): same recipe, 112px minimum, grows with content.
- **Checkbox** (`{components.checkbox}` / `-checked`): 18px, ink fill with an inverted check when checked.
- **Switch** (`{components.switch-track}` / `-checked`): pill track, Stone when off and ink when on. The thumb slides in 200ms with expo-out easing.
- **Select** (`{components.select-trigger}`): the trigger matches the input. The popup is surface-1 with Elevation 2 and field radius. Use `{components.native-select}` (the platform picker on the same recipe) when the OS picker is the better UI, mostly on phones.
- **Field parts:** build every form from `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldContent`, `FieldTitle` and `FieldSeparator`. Set `data-invalid` on the Field and `aria-invalid` on the control when invalid; swap the description for `FieldError` with a written fix. Validate on submit, then re-check live so errors clear as soon as the field is fixed.
- **Input group** (`{components.input-group}`): one field shell holding addons (icons, `https://` text, a show-password or copy button, a character count). The whole group's border turns signal on focus, with no ring; buttons inside stay fully rounded and use the xs or icon-xs sizes.
- **Radio** (`{components.radio}` / `-checked`): an 18px circle matching the checkbox; ink fill with a paper dot when checked. Use for one choice from a few visible options. On toggle the dot grows from the centre (scale 0 to 1 with opacity, 200ms expo-out) and shrinks back when deselected.
- **Check swap:** the checkbox check swaps in like `IconSwap` (opacity, scale from 0.25, 4px blur, 200ms expo-out) and animates out the same way.
- **Choice card** (`{components.choice-card}` / `-checked`): a `FieldLabel` wrapping a horizontal `Field`, with a 1px hairline-strong border and 8px corners. Selected lifts to surface-2 with an ink border. Press scales to 0.98 (button timing: 100ms down, 200ms release); none under reduced motion.
- **One-time code** (`{components.otp-slot}`): joined 44px cells in body-lg 500 with tabular figures; the active cell's border turns signal, with no ring.
- **Slider** (`{components.slider-track}`, `-range`, `-thumb`): a 6px surface-3 track with an ink range and a 20px surface-1 thumb with the subtle shadow. The thumb scales to 1.1 while dragged (off under reduced motion). Always show the current value beside the label.
- **Toggle** (`{components.toggle}` / `-pressed`): a pressed state, not an action, so it uses 6px control corners (`{rounded.control}`) like the tab track instead of the button pill. Pressed lifts to surface-2 with ink text. Toggle groups join items with no gap in the outline variant.

### Tabs

- `{components.tabs-list}`: segmented Pebble track with 6px control corners (`{rounded.control}`). The active tab (`{components.tabs-trigger-active}` / `-dark`) lifts on a sliding 4px thumb, and its label moves from ink-muted to ink. **Selection is lift, not color.** A line variant (2px ink underline) is available for dense contexts.

### Accordion

- `{components.accordion-trigger}`: full-width rows divided by single hairlines. The trigger is body-lg 500, and a plus icon in a 32px Pebble chip with 4px corners rotates 45 degrees when open (400ms). Content (`{components.accordion-content}`) is muted body at max 60ch.

### Overlays

- **Dialog** (`{components.dialog}`): surface-1, panel radius, Elevation 3. It opens with a 200ms fade and a scale from 0.96.
- **Tooltip** (`{components.tooltip}`): inverted (ink fill, inverted label), sm radius, caption type.

### Avatar, separator, skeleton

- **Avatar** (`{components.avatar}`): full circle, hairline ring, initials in caption type on Pebble. Sizes: sm 32px, default 40px, lg 48px. On a gradient card the fallback uses On Gradient at 15% with On Gradient initials.
- **Separator:** 1px hairline.
- **Skeleton** (`{components.skeleton}`): Pebble blocks shaped like the final layout, with a slow shimmer that is disabled under reduced motion. No circular spinners.

### Landing compositions

- **Page structure (reference landing page, top to bottom).** Eight sections, eight different layout families:
  | #   | Section                   | Layout family                                                     | Headline token         |
  | --- | ------------------------- | ----------------------------------------------------------------- | ---------------------- |
  | 1   | Hero                      | Asymmetric 7/5 split, product preview on a coral panel            | `display-xl`           |
  | 2   | Channel marquee           | Full-width logo strip (the page's only marquee)                   | none (sr-only heading) |
  | 3   | How it works (`#product`) | Pinned story: visual pinned left, three steps scroll right        | `display-lg`           |
  | 4   | Features (`#features`)    | Bento with exactly five cells and mixed spans                     | `display-lg`           |
  | 5   | Pricing (`#pricing`)      | Asymmetric 5/7 plan pair plus a ghost row; the page's one eyebrow | `display-lg`           |
  | 6   | Testimonial               | Single quote on a magenta poster                                  | `display-md`           |
  | 7   | FAQ (`#faq`)              | 4/8 split: heading left, accordion right                          | `display-sm`           |
  | 8   | Final CTA (`#start`)      | Email form on an orange gradient card                             | `display-lg`           |
- **Top nav** (`{components.top-nav}`): fixed, 64px, canvas at 80% with backdrop blur, and a hairline bottom once scrolled. Wordmark on the left, at most 3 links, ghost "Sign in" plus primary "Start free" on the right. It stays on one line at desktop; below 48rem the links collapse into a menu.
- **Post preview:** a real component preview (not a fake screenshot): a floating card with a photo, caption, channel mark and schedule badge.
- **Channel marquee:** monochrome channel logos on one line. **One marquee per page.**
- **Footer** (`{components.footer}`): canvas, caption links in ink-muted, hairline top.
- **Card variant map (reference landing page).** Every card variant appears once in its intended role, top to bottom:

  | Section        | Variants                                                                       | Why                                                              |
  | -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
  | Hero           | `card-floating` (post preview, approval note) on a `gradient-card-coral` panel | Real product, framed as a living poster                          |
  | How it works   | `card-floating` (step previews), `card-inverse` (client link note, mid-story)  | A high-contrast aside that stands out without a gradient         |
  | Features bento | `card` x2, `card-featured` (reports), `gradient-card-violet` (bottom-right)    | Mixed lift plus one rhythm break                                 |
  | Pricing        | `card` (Starter), `card-featured` (Team), `card-ghost` (custom plans)          | Lift marks the recommended plan; ghost groups the secondary path |
  | Testimonial    | `gradient-card-magenta`                                                        | The quote as a poster                                            |
  | Final CTA      | `gradient-card-orange` with the email form                                     | Closing conversion moment                                        |

  Neutral sections (channel marquee, how it works, pricing, FAQ) sit between gradient sections, so no two gradient cards share a viewport.

## Motion

**Library:** GSAP 3 with ScrollTrigger, ScrollSmoother and SplitText, registered once. Every animated piece is an isolated client component with automatic cleanup (`useGSAP` scoped to its root). Do not mix GSAP with a second animation library in the same tree.

### Motion tokens

| Token             | Value                                                  | Use                              |
| ----------------- | ------------------------------------------------------ | -------------------------------- |
| duration-instant  | 120ms                                                  | Press feedback                   |
| duration-fast     | 200ms                                                  | Hover, switch thumb, tooltip     |
| duration-base     | 400ms                                                  | Accordion, tab thumb, dialog     |
| duration-slow     | 700ms                                                  | Card reveals                     |
| duration-reveal   | 1000ms                                                 | Headline line reveals            |
| ease-out-expo     | `cubic-bezier(0.16, 1, 0.3, 1)` (GSAP `expo.out`)      | Every entrance                   |
| ease-in-out-quart | `cubic-bezier(0.65, 0, 0.35, 1)` (GSAP `power3.inOut`) | State changes, pinned sequences  |
| ease-scrub        | `none`                                                 | Anything tied to scroll position |
| stagger           | 0.08s                                                  | Sibling sequencing               |
| reveal-distance   | 2rem (32px)                                            | Rise-in offset                   |

### Smooth scroll

- **ScrollSmoother** wraps every landing page with `smooth: 1.1`, `smoothTouch: 0.12` (gentle smoothing on mobile and touch) and `effects: true` (enables `data-speed` / `data-lag`).
- Fixed elements (nav, dialogs) live **outside** the smooth content. Inside it, use ScrollTrigger `pin` instead of CSS `position: sticky`.
- In-page anchors scroll through the smoother with a 5rem (80px) top offset so headings clear the nav.

### Scroll choreography (canonical recipes)

| Pattern         | Spec                                                                                                                               | Communicates                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Headline reveal | Split into masked lines; lines rise from 110% below with 0.08s stagger, 1.0s expo-out                                              | Reading order of hero and section openers |
| Rise-in reveal  | Elements from 2rem below and opacity 0, 0.9s expo-out, 0.08s stagger, trigger when the top reaches 85% of the viewport, plays once | Content appears as it is reached          |
| Batch reveal    | Grid cells revealed as a group (interval 0.1s, stagger 0.08s)                                                                      | Bento and pricing arrive together         |
| Parallax        | Speed 0.9 to 1.1 on imagery only, never on text                                                                                    | Depth on hero previews                    |
| Pinned story    | Left column pinned from `top top`; steps activate at viewport centre; progress rail scrubbed                                       | "How it works" sequence                   |
| Scrubbed text   | Quote words go from opacity 0.15 to 1 across the block, scrub 0.5                                                                  | Pacing for the single testimonial         |
| Marquee         | Translate -50% loop, 40s linear, infinite; slows on hover                                                                          | Breadth of supported channels             |

### Motion engine (data attributes)

One client component (`MotionEngine`) per landing page creates the smoother first, then every ScrollTrigger, inside a single `gsap.matchMedia`. Sections stay server components and opt in with attributes:

| Attribute                                                                                 | Behaviour                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `data-split="load"` / `"scroll"`                                                          | Masked line reveal on a headline, on page load or when scrolled to             |
| `data-reveal="load"` / `"scroll"` (+ `data-reveal-delay="0.35"`)                          | Rise-in reveal for one element                                                 |
| `data-reveal-group`                                                                       | Batch reveal of the element's children                                         |
| `data-speed="0.92"`                                                                       | Parallax speed (imagery only)                                                  |
| `data-marquee`                                                                            | Infinite -50% loop on a track rendered twice                                   |
| `data-scrub-words`                                                                        | Words brighten from 15% to 100% opacity with scroll                            |
| `data-story`, `data-story-pin`, `data-story-step`, `data-story-visual`, `data-story-rail` | Pinned story parts; steps get `data-active`                                    |
| `data-nav`                                                                                | Gets `data-scrolled="true"` after 8px of scroll (works with or without motion) |

- An inline script adds `.js-motion` to `<html>` before first paint, only when JS runs and motion is allowed; reveal targets are hidden only under that class.
- **Reduced motion:** no smoother, no reveals (content renders in place), marquee static. The pinned story falls back to CSS `position: sticky`, and its steps still switch instantly, because that is a state change, not decoration.
- In-page `#anchor` links scroll through the smoother with the 80px offset.

### Micro-interactions (CSS)

- Buttons: CSS transitions only (never keyframes), so every state can be interrupted and retargets mid-flight. 200ms color; press scales to 0.97 in 100ms and releases over 200ms; icon swaps blur and scale over 200ms; trailing arrows nudge 2px. Linked cards lift 2px on hover over 400ms with expo-out.
- Prefer transitions for interactions and keyframes only for staged sequences that run once (the shimmer skeleton).
- Animate only `transform` and `opacity`, never width, height, top or left.

### Motion rules

- **Motion must be motivated.** Each animation answers "what does this communicate?" with hierarchy, storytelling, feedback or state change. If it can't, cut it.
- **Reduced motion is mandatory.** Under `prefers-reduced-motion: reduce`, smooth scroll is off, reveals render in their final state, and the marquee stops.
- **No scroll listeners.** No `scroll` event handlers and no scroll position in component state. Use ScrollTrigger.
- **Pins start at `top top`.**
- **No flash before reveal:** reveal targets are hidden from first paint only when JS runs and motion is allowed. Without JS, content is visible.
- One marquee per page. No infinite loops on informational content. No scroll cues.

## Utilities

The utility layer mirrors the tokens one-to-one (Tailwind v4 naming).

| Utility                                                                                                                       | Token                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `container-page`                                                                                                              | `{spacing.container}` max width + responsive gutters                             |
| `section-y`                                                                                                                   | `{spacing.section}` / `{spacing.section-lg}` vertical rhythm                     |
| `text-display-xl`, `text-display-lg`, `text-display-md`, `text-display-sm`                                                    | Responsive display tokens (rem steps at 48rem and 64rem)                         |
| `text-headline`, `text-body-lg`, `text-body`, `text-body-sm`, `text-caption`, `text-micro`                                    | Matching typography tokens                                                       |
| `font-normal`, `font-medium`, `font-extrabold`                                                                                | 400 / 500 / 800, the only weights compiled                                       |
| `bg-background`, `bg-card`, `bg-surface-2`, `bg-surface-3`                                                                    | canvas, surface-1, surface-2, surface-3                                          |
| `text-foreground`, `text-muted-foreground`                                                                                    | ink, ink-muted                                                                   |
| `border-border`, `border-hairline-strong`                                                                                     | hairline, hairline-strong                                                        |
| `text-signal`, `bg-signal`, `bg-signal/12`, `ring-ring`                                                                       | signal (opacity modifiers supported)                                             |
| `text-success`, `text-warning`, `text-destructive`                                                                            | semantic states                                                                  |
| `shadow-subtle`, `shadow-float`, `shadow-modal`, `shadow-soft`                                                                | Default-card lift, Elevation 2, 3 and the inverse-card soft shadow (theme-aware) |
| `rounded-full`, `rounded-panel`, `rounded-field`, `rounded-card`, `rounded-control`, `rounded-sm`, `rounded-xs`               | Shape tokens (9999 / 10 / 10 / 8 / 6 / 4 / 2px)                                  |
| `bg-gradient-violet`, `bg-gradient-magenta`, `bg-gradient-orange`, `bg-gradient-coral`, `text-on-gradient`                    | Gradient card fills and their text color                                         |
| `bg-[var(--signal-tint)] text-[var(--signal-ink)]` (and `--success-*`, `--warning-*`, `--destructive-*`)                      | Solid tint plus deeper ink for tinted badges                                     |
| `inverse` (class)                                                                                                             | Applies the opposite theme's tokens to an element and everything inside it       |
| `ease-out-expo`, `ease-in-out-quart`, `duration-fast`, `duration-base`, `duration-slow`                                       | Motion tokens                                                                    |
| `text-balance`, `text-pretty`, `tabular-nums`                                                                                 | Headline balance, orphan control, aligned figures                                |
| `data-icon="start"` / `"end"` / `"arrow"`                                                                                     | Icon position inside a button (optical padding, arrow nudge)                     |
| `data-reveal`, `data-reveal-group`, `data-split`, `data-speed`, `data-marquee`, `data-scrub-words`, `data-story*`, `data-nav` | Hooks for the motion engine (see Motion)                                         |

**Class merging:** components merge classes with `cn` from `@/lib/utils`, configured with the custom tokens. Any new custom size, radius or shadow utility must be registered there; otherwise `cn` treats it as a color and silently drops the real color class (for example `text-body-sm` would remove `text-foreground`).

## Iconography

- **Library:** `lucide-react`, one family across the product. Stroke is standardised to **1.75** in global CSS (`.lucide { stroke-width: 1.75 }`), so never pass `strokeWidth` per icon.
- **Sizes:** 14px (`{spacing.icon-sm}`) in xs buttons and badges, 16px (`{spacing.icon-md}`) everywhere by default, 20px (`{spacing.icon-lg}`) in empty states and large controls.
- **In buttons:** mark position with `data-icon="start"`, `"end"` or `"arrow"`. Icon-only buttons always carry an `aria-label`.
- **Changing icons:** use `IconSwap` (opacity + 0.25 scale + 4px blur, 200ms, CSS transitions so it can be interrupted).
- **Brand and channel logos:** real marks from `simple-icons`, rendered as inline SVG with `fill: currentColor` so they follow the theme. Never draw logos or icons by hand. Logo walls show logos only, with the brand name as the accessible label.
- **Color:** icons inherit text color; ink-muted for decorative or secondary icons, signal only for a selected or linked state.

## Accessibility

- **Contrast:** body text AA minimum (both inks clear AAA on canvas), large text 3:1 minimum, and every button label checked against its fill in both themes. Tinted badges use deeper ink colors so micro text passes AA.
- **Focus:** two models. Controls (buttons, tabs, toggles, switches, checkboxes, radios, accordion triggers, links, linked cards) show a solid 2px signal ring with a 2px offset (opaque, so it clears 3:1 against canvas; a translucent tint would not). Fields (inputs, textareas, selects, input groups, OTP) show only the signal border, with no ring or shadow. Focus is never removed without a replacement.
- **Touch:** 44px targets by default; smaller sizes extend their hit area on coarse pointers.
- **Motion:** everything above static honours `prefers-reduced-motion` (see Motion). Press scale, the arrow nudge and slider thumb growth are also switched off.
- **Transparency:** under `prefers-reduced-transparency`, the scrolled nav and the dialog backdrop drop their blur for solid canvas.
- **Forms:** labels are real `<label>`s above the control; helper and error text are linked with `aria-describedby`; invalid controls set `aria-invalid`; errors are written as fixes and announced with `role="alert"`; success messages use `role="status"`.
- **Structure:** one `h1` per page, sections in heading order, an sr-only heading for the logo wall, `aria-pressed` on toggle buttons, `aria-expanded` on the mobile menu button.
- **Decorative previews:** product previews built from real components are marked `inert` so they never take focus or confuse screen readers. Images that carry meaning have alt text; decorative images use `alt=""`.
- **Themes:** `color-scheme` is set per theme so native controls (scrollbars, date pickers, the native select popup) match.

## Content & Voice

- **Tone:** plain, specific and calm. Concrete verbs over hype ("Plan every post", not "Supercharge your workflow"). No "elevate", "seamless", "unleash", "next-gen".
- **CTA labels:** 3 words max, one label per intent across the whole page ("Start free" for signup, "Write to us" for contact).
- **Headlines:** at most 8 words for sections, 2 lines for the hero. Hero subtext at most 20 words; section body at most 25.
- **Punctuation:** no em-dashes or en-dash separators. Typographic quotes in testimonials. Ranges with a hyphen. At most one middle dot per line.
- **Names and data:** realistic, locale-appropriate names (not "John Doe", not "Acme"). Numbers that are not real (prices, counts, testimonials) are marked as sample data in code. No fake precision.
- **Errors and empty states:** say what happened and how to fix it ("Enter a full email address, like name@company.com."). Empty states say what goes here and offer the action to add it.
- **Labels:** sentence case everywhere: buttons, labels, headings. The only uppercase is the single eyebrow, tracked at 0.08em.

## Do's and Don'ts

### Do

- Use DM Sans for everything at 400 and 500, with 800 only for a single emphasis per viewport.
- Use rem for every font size and em for every letter-spacing.
- Keep one theme per page, and check both light and dark before shipping.
- Reserve Signal for links, focus, selection and one highlight.
- Use gradient cards as the rhythm break: one per section, with a neutral section between each.
- Use surface lift (canvas, then surface-1, then surface-2) to mark hierarchy, not opacity on text.
- Show the real product: compose previews from real components, real photography and real channel logos.
- Give every animation a reason and a reduced-motion fallback.
- Keep the hero inside the first viewport: headline of 2 lines max, subtext of 20 words max, CTAs visible.
- Mark icons in buttons with `data-icon`, and swap state icons with `IconSwap`.
- Check every page at 375px for horizontal overflow, and on a production build.

### Don't

- Don't use 300, 600 or 700 weights, a second typeface, or serif accents.
- Don't use px or vw for font sizes, or px for letter-spacing.
- Don't use em-dashes in UI copy, section-number eyebrows ("01 / Features"), version labels in the hero, scroll cues, or decorative status dots.
- Don't build three equal feature cards, split headers with a floating side paragraph, or div-based fake dashboards.
- Don't use gradients anywhere except gradient cards: no glows, gradient text, gradient buttons or gradient section backgrounds. No pure black or white.
- Don't put two gradient cards in one section, one grid or one viewport, and don't place a gradient card in the section directly after another one.
- Don't put two CTAs with the same intent on one page under different labels.
- Don't animate layout properties or attach scroll listeners.
- Don't put a border on default, featured, inverse or gradient cards, or a shadow or focus ring on a field.
- Don't exceed 10px corners on anything that isn't a button, avatar or switch track.
- Don't accept a shadcn overwrite of an existing component, and don't add a custom utility without registering it in `cn`.

## Responsive Behavior

### Breakpoints

| Name         | Width                            | Key changes                                                                                                |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Mobile       | < 40rem (640px)                  | Single column everywhere, 16px gutters, display sizes at their `-sm` tokens                                |
| Large mobile | 40rem to 48rem                   | 24px gutters; card grids stay single column                                                                |
| Tablet       | 48rem to 64rem (768px to 1024px) | Display sizes step to `-md`; bento goes 2-up; pricing stays stacked until 64rem; nav links show from 48rem |
| Desktop      | >= 64rem (1024px)                | Full 12-column grid, display sizes at base tokens, pinned scroll stories enabled                           |
| Wide         | >= 80rem (1280px)                | Container caps at 1200px; extra width becomes canvas                                                       |

### Touch targets

- Default buttons, tabs, toggles, fields and icon buttons are **44px** (`{spacing.touch-min}`). The xs (28px), sm (36px), icon-xs and icon-sm sizes are desktop density; on coarse pointers (`pointer: coarse`) an invisible `::after` extends their hit area to at least 44px without changing how they look.
- Switches and checkboxes extend their hit area with an invisible 12px horizontal and 8px vertical pad.
- Keep segmented tabs to 2 to 4 short labels so they fit a phone width. For more options, use the line variant inside an `overflow-x-auto` row, never a wrapped second line.

### Collapsing strategy

- **Nav:** wordmark plus the primary "Start free" pill stay on the bar; links and "Sign in" move into a menu below 48rem.
- **Hero:** the 7/5 split stacks to text first and preview second. Parallax speeds stay within 0.92 to 1.06 so the drift remains subtle on small screens; the floating approval note is hidden below 64rem.
- **Card grids:** bento goes from 6 columns to 2 at tablet and 1 at mobile, and gradient cards keep panel radius at every size, so they never bleed.
- **Pinned story:** the pin is desktop-only. Below 64rem each step stacks with its own visual inline.
- **Pricing:** the side-by-side asymmetric pair stacks, featured plan first.
- **FAQ:** the 4/8 split stacks to heading then accordion.
- **Display type:** steps down through `-md` and `-sm` tokens while keeping the same em tracking, so the percentage compression holds.

### Image behavior

- Photography uses fixed aspect ratios (4:5 for posts, 16:8 to 16:10 for wide tiles, 1:1 for thumbnails), so the layout never shifts as images load (CLS < 0.1). Remote photos go through `next/image` with `sizes` set.
- The hero image is prioritised; everything below the fold lazy-loads.
- Product previews keep their aspect ratio and never crop UI.
- Gradient orientation (light from the top-right) is fixed at every breakpoint.

## Iteration Guide

1. Work on ONE component at a time, and reference it by its `components:` token name (`{components.button-primary}`, `{components.gradient-card-violet}`).
2. For a new section, first decide which lift it lives on: `{colors.canvas}` for hero and FAQ, `{colors.surface-1}` for cards, `{colors.surface-2}` for featured cards. Depth is the most consequential choice.
3. Default body to `{typography.body}`. Reach for display tokens only for section openers and gradient cards.
4. Run `npx @google/design.md lint DESIGN.md` after edits. `broken-ref`, `contrast-ratio` and `orphaned-tokens` findings flag issues automatically.
5. Add new variants as separate component entries (`-hover`, `-dark`, `-featured`, `-selected`), not as prose.
6. Treat Signal as a single-shot color: links, focus and selection. If you reach for a second accent, the brand is drifting.
7. Gradient cards are a rhythm break, not wallpaper: one per section, always separated by a neutral section.
8. Before shipping, run the pre-flight: theme lock, one accent, shape lock, border rule, eyebrow count, CTA intent, em-dash scan, rem-only font sizes, reduced motion, both themes viewed, no horizontal overflow at 375px.
9. Add shadcn components with `shadcn add`, and never accept an overwrite of an existing file (answer "no" or omit `--overwrite`): the existing files carry the restyle. Then restyle the new file to these tokens and point its `cn` import at `@/lib/utils`.
10. When you add a custom utility (size, radius, shadow), register it in the `cn` config in `src/lib/utils.ts` in the same change.

## Implementation

### Stack

| Layer           | Choice                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Cache Components, React Compiler), React 19, TypeScript |
| Styling         | Tailwind CSS v4 (`@theme`, `@utility`, `@custom-variant dark`), tw-animate-css  |
| Components      | shadcn/ui, `base-nova` style, on Base UI primitives (`@base-ui/react`)          |
| Class merging   | `cn` (from the `cn` package) via `createCn` with the custom tokens registered   |
| Motion          | GSAP 3 (`gsap`, `@gsap/react`) with ScrollTrigger, ScrollSmoother, SplitText    |
| Type            | DM Sans via `next/font/google`, weights 400 / 500 / 800, `--font-dm-sans`       |
| Icons           | `lucide-react`; brand logos from `simple-icons`                                 |
| Package manager | bun                                                                             |

### File map

| Path                                                     | Holds                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md`                                              | This spec, the normative source of truth                                                                                                          |
| `src/app/globals.css`                                    | Tokens as CSS variables (light `:root`, dark `.dark`, flipped inside `.inverse`), type scale, radii, shadows, gradient utilities, motion pre-hide |
| `src/lib/utils.ts`                                       | `cn` with custom token groups                                                                                                                     |
| `src/lib/gsap.ts`                                        | Plugin registration and motion constants mirroring `motion.*` tokens                                                                              |
| `src/components/ui/*`                                    | Restyled shadcn components plus `icon-swap`                                                                                                       |
| `src/components/motion/motion-engine.tsx`                | Smooth scroll and every scroll animation                                                                                                          |
| `src/components/landing/*`                               | Landing sections, nav, footer, wordmark, channel icons, post preview                                                                              |
| `src/components/gallery/*`                               | Design-system page shell (`DocPage`, `DocSection`, `Code`) and interactive demos                                                                  |
| `src/app/(light)`, `src/app/(dark)`, `src/app/(gallery)` | Route groups, each with its own root layout                                                                                                       |

### Themes in code

Each route group has its own root layout, built by a shared `RootShell`, which puts `.dark` (or nothing) on `<html>`. Because the theme lives on `<html>`, portalled overlays inherit it. Landing layouts also inject the `.js-motion` script. The gallery toggles `.dark` on `<html>` at runtime for side-by-side review.

### Known implementation gotchas

- Tailwind v4 `scale-*` sets the CSS `scale` property, so transitions must list `scale`, not just `transform`.
- Never build class names by string interpolation (`` `text-${size}` ``); Tailwind cannot see them. Use a lookup of full class names.
- Base UI `Select.Icon` injects a default "▼" text node; pass the chevron as a child.
- `container-type` on a card header creates a containing block that traps a stretched link; interactive cards reset it.
- CSS custom properties referenced through `@theme inline` resolve at the element, which is what lets `.inverse` re-theme its subtree.
- Validate on a production build (`bun run build && bun run start`): a long-running dev server can keep serving stale `@theme` values.

## Reference pages

| Route             | Shows                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/`               | Design system overview: colors, gradients, type, radius, buttons, badges, cards, forms, tabs, accordion, overlays |
| `/ui/button`      | Every button variant, size, state, motion detail and layout pattern                                               |
| `/ui/card`        | Every card variant, size, anatomy, media, interactive, inverse, gradient composition and states                   |
| `/ui/input`       | Every field, input group, select, choice control, OTP, slider, toggle and a validated form                        |
| `/ui/typography`  | Typeface, weights, display and text scales, tracking, wrapping, emphasis, numbers, punctuation                    |
| `/light`, `/dark` | The reference landing page in each theme, using every card variant in role                                        |

## Known Gaps

- Gradient stops are designed anchors, not extracted production values. Treat `{gradients.*}` as the spec and tune stops visually if a card reads muddy on a specific screen.
- The `elevation`, `backdrop`, `opacity`, `motion`, `breakpoints`, `gradients` and `z-index` groups extend the base DESIGN.md token schema. Consumers that only understand the core schema preserve them without validating them.
- Data-heavy product UI (tables, dashboards, multi-step wizards) is out of scope for this marketing system and needs its own density rules.
- Illustration style is not specified; the system relies on photography and real component previews instead.
- Landing copy, prices, names and photography are placeholders until real Postessia content and assets exist.
