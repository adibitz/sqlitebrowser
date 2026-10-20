import { useTabsStore, type BrowseState } from '@/store/tabs'

/** The browse state of table tab `tabId`, if it is still open. */
export function browseOf(tabId: string): BrowseState | undefined {
  const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)
  return tab?.kind === 'table' ? tab.browse : undefined
}
