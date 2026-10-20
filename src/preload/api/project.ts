import { ipcRenderer } from 'electron'
import { projectChannels, type ProjectApi } from '@shared/ipc/project'

export const projectApi: ProjectApi = {
  open: (req) => ipcRenderer.invoke(projectChannels.open, req),
  save: (req) => ipcRenderer.invoke(projectChannels.save, req),
}
