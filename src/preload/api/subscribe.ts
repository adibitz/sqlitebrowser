import { ipcRenderer, type IpcRendererEvent } from 'electron'

/** Listens to a main → renderer event channel; returns the unsubscribe function. */
export function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}
