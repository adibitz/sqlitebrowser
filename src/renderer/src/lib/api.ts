import type { WindowApi } from '@shared/ipc'

/** Typed bridge to the main process (exposed by src/preload). */
export const api: WindowApi = window.api
