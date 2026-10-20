import { create } from 'zustand'

interface ProjectState {
  /** The .sqbpro file the workspace was opened from or saved to; null when there is none. */
  path: string | null
  setPath(path: string | null): void
}

export const useProjectStore = create<ProjectState>()((set) => ({
  path: null,
  setPath: (path) => set({ path }),
}))
