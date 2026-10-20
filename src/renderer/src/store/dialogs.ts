import { create } from 'zustand'

export interface ConfirmAction {
  id: string
  label: string
  variant?: 'default' | 'destructive' | 'secondary'
}

export interface ConfirmRequest {
  kind: 'confirm'
  title: string
  description?: string
  /** Shown right to left in reading order, the last one is the default. */
  actions: ConfirmAction[]
  cancelLabel?: string
}

export interface PromptRequest {
  kind: 'prompt'
  title: string
  description?: string
  label: string
  initialValue?: string
  confirmLabel: string
}

type Pending =
  | (ConfirmRequest & { resolve: (actionId: string | null) => void })
  | (PromptRequest & { resolve: (value: string | null) => void })

interface DialogState {
  current: Pending | null
  /** Closes the open dialog with a result (null = cancelled). */
  settle(result: string | null): void
}

export const useDialogStore = create<DialogState>()((set, get) => ({
  current: null,
  settle(result) {
    const current = get().current
    if (!current) return
    set({ current: null })
    current.resolve(result)
  },
}))

function open(request: Pending): void {
  // A new request replaces an open one, which counts as cancelled.
  useDialogStore.getState().settle(null)
  useDialogStore.setState({ current: request })
}

/** Asks a question; resolves with the chosen action id, or null when cancelled. */
export function confirm(request: Omit<ConfirmRequest, 'kind'>): Promise<string | null> {
  return new Promise((resolve) => open({ kind: 'confirm', ...request, resolve }))
}

/** Asks for one line of text; resolves with it (trimmed), or null when cancelled. */
export function prompt(request: Omit<PromptRequest, 'kind'>): Promise<string | null> {
  return new Promise((resolve) => open({ kind: 'prompt', ...request, resolve }))
}
