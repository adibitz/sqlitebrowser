import { toast } from 'sonner'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { confirm } from '@/store/dialogs'
import { isSqlModified, useTabsStore, type SqlTab } from '@/store/tabs'

const SQL_FILTERS = [
  { name: 'SQL files', extensions: ['sql'] },
  { name: 'Text files', extensions: ['txt'] },
]

function nameOf(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

/** Opens a .sql file in a new editor tab (port of SqlTab.open_file). */
export async function openSqlFile(): Promise<void> {
  try {
    const file = await api.files.openText({ title: 'Open SQL file', filters: SQL_FILTERS })
    if (file) useTabsStore.getState().openSql({ text: file.content, path: file.path, name: file.name })
  } catch (err) {
    toast.error(`Couldn't read the file: ${errorMessage(err)}`)
  }
}

/** Saves to the tab's file, or asks for one (port of SqlTab.save_file). Resolves false when cancelled. */
export async function saveSqlTab(tab: SqlTab, saveAs = false): Promise<boolean> {
  try {
    let path = tab.path
    if (saveAs || !path) {
      path = await api.files.saveText({
        title: 'Save SQL file',
        defaultName: tab.path ? nameOf(tab.path) : `${tab.name}.sql`,
        filters: SQL_FILTERS,
        content: tab.text,
      })
      if (!path) return false
    } else {
      await api.files.writeText({ path, content: tab.text })
    }
    useTabsStore.getState().markSqlSaved(tab.id, path, nameOf(path), tab.text)
    toast.success(`Saved ${nameOf(path)}`)
    return true
  } catch (err) {
    toast.error(`Couldn't save the file: ${errorMessage(err)}`)
    return false
  }
}

/** Closes a tab, asking first when it is an SQL tab with unsaved edits. */
export async function closeTab(id: string): Promise<void> {
  const tab = useTabsStore.getState().tabs.find((t) => t.id === id)
  if (tab?.kind === 'sql' && isSqlModified(tab)) {
    const choice = await confirm({
      title: `Save changes to ${tab.name}?`,
      description: 'Your SQL will be lost if you close without saving.',
      actions: [
        { id: 'discard', label: "Don't save", variant: 'secondary' },
        { id: 'save', label: 'Save' },
      ],
    })
    if (choice === null) return
    if (choice === 'save' && !(await saveSqlTab(tab))) return
  }
  useTabsStore.getState().close(id)
}
