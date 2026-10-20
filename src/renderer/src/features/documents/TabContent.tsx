import { DbInfoTab } from '@/features/dbInfo/DbInfoTab'
import { SchemaTab } from '@/features/schema/SchemaTab'
import { SqlTab } from '@/features/sql/SqlTab'
import { TableTab } from '@/features/table/TableTab'
import type { DocTab } from '@/store/tabs'

/** The view for one document tab. */
export function TabContent({ tab }: { tab: DocTab }) {
  if (tab.kind === 'table') {
    return <TableTab tabId={tab.id} object={tab.object} view={tab.view} browse={tab.browse} />
  }
  if (tab.kind === 'sql') return <SqlTab tab={tab} />
  if (tab.kind === 'info') return <DbInfoTab />
  return <SchemaTab initialScope={tab.object} />
}
