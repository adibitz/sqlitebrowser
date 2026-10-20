import { ipcRenderer } from 'electron'
import { prefsChannels, type PrefsApi } from '@shared/ipc/prefs'

export const prefsApi: PrefsApi = {
  getAll: () => ipcRenderer.invoke(prefsChannels.getAll),
  set: (key, value) => ipcRenderer.invoke(prefsChannels.set, { key, value }),
}
