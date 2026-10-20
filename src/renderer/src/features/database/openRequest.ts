// Port of the startup step of reference/sqliteview/app.py: what the command line (or another launch)
// asks to open.
import { toast } from 'sonner'
import type { StartupRequest } from '@shared/types/app'
import { findTable } from '@shared/types/schema'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'
import { openDatabaseAt } from './actions'

export async function handleOpenRequest(request: StartupRequest): Promise<void> {
  if (request.database && (await openDatabaseAt(request.database, request.readOnly)) && request.table) {
    const ref = { schema: 'main', name: request.table }
    if (findTable(useDbStore.getState().state.schemata, ref)) useTabsStore.getState().openTable(ref)
    else toast.warning(`There is no table named ${request.table}.`)
  }
  if (!request.sql) return
  try {
    const file = await api.files.openTextAt({ path: request.sql })
    const canRun = useDbStore.getState().state.isOpen
    useTabsStore.getState().openSql({
      text: file.content,
      path: file.path,
      name: file.name,
      ...(canRun && { autoRun: request.quit ? 'runAndQuit' : 'run' }),
    })
  } catch (err) {
    toast.error(`Couldn't open ${request.sql}: ${errorMessage(err)}`)
  }
}
