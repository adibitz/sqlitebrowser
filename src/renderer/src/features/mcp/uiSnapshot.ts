import type { UiSnapshot } from '@shared/types/mcp'
import { tabTitle } from '@/features/documents/tabTitle'
import type { DocTab } from '@/store/tabs'
import { describeTab } from './describeTab'

/** What the window shows, as reported to MCP clients. */
export function uiSnapshot(tabs: DocTab[], activeId: string | null): UiSnapshot {
  return {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      kind: tab.kind,
      title: tabTitle(tab),
      description: describeTab(tab) ?? '',
    })),
    activeTabId: activeId,
  }
}
