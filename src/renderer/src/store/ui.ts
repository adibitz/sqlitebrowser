import { create } from 'zustand'

interface UiStore {
  explorerVisible: boolean
  inspectorVisible: boolean
  logVisible: boolean
  plotVisible: boolean
  chatVisible: boolean
  paletteOpen: boolean
  /** Only the current grid is shown (F11); Esc leaves. */
  fullScreen: boolean
  toggleExplorer(): void
  toggleInspector(): void
  toggleLog(): void
  togglePlot(): void
  toggleChat(): void
  setPaletteOpen(open: boolean): void
  setFullScreen(on: boolean): void
}

export const useUiStore = create<UiStore>()((set) => ({
  explorerVisible: true,
  inspectorVisible: false,
  logVisible: false,
  plotVisible: false,
  chatVisible: false,
  paletteOpen: false,
  fullScreen: false,
  toggleExplorer: () => set((s) => ({ explorerVisible: !s.explorerVisible })),
  toggleInspector: () => set((s) => ({ inspectorVisible: !s.inspectorVisible })),
  toggleLog: () => set((s) => ({ logVisible: !s.logVisible })),
  togglePlot: () => set((s) => ({ plotVisible: !s.plotVisible })),
  toggleChat: () => set((s) => ({ chatVisible: !s.chatVisible })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setFullScreen: (fullScreen) => set({ fullScreen }),
}))
