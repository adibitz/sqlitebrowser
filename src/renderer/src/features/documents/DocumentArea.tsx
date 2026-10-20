import { useEffect } from 'react'
import { FileCodeIcon, TableIcon, TerminalSquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { DocumentTabs } from './DocumentTabs'
import { TabContent } from './TabContent'

/**
 * Tab strip + documents. SQL tabs stay mounted while hidden, so editors keep their undo history and
 * results; table and schema tabs mount only while active (their state lives in the tabs store).
 */
export function DocumentArea() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)
  const schemata = useDbStore((s) => s.state.schemata)
  const fullScreen = useUiStore((s) => s.fullScreen)
  const active = tabs.find((t) => t.id === activeId)

  // Tables that were dropped or renamed (by SQL, revert or another program) lose their tab.
  useEffect(() => {
    useTabsStore.getState().pruneMissing(schemata)
  }, [schemata])

  if (!tabs.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <TableIcon className="size-5 text-muted-foreground" />
        <p className="max-w-sm text-muted-foreground">
          Open a table from the Explorer, write SQL, or look at the whole schema.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => useTabsStore.getState().openSql()}>
            <TerminalSquareIcon data-icon="inline-start" />
            New SQL editor
          </Button>
          <Button variant="secondary" onClick={() => useTabsStore.getState().openSchema(null)}>
            <FileCodeIcon data-icon="inline-start" />
            Show schema
          </Button>
        </div>
      </div>
    )
  }

  const panel = (id: string, hidden: boolean, child: React.ReactNode): React.ReactNode => (
    <div
      key={id}
      id={`doc-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`doc-tab-title-${id}`}
      hidden={hidden}
      className={cn('min-h-0 flex-1 bg-card', hidden && 'hidden')}
    >
      {child}
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {!fullScreen && <DocumentTabs />}
      {tabs
        .filter((t) => t.kind === 'sql')
        .map((t) => panel(t.id, t.id !== activeId, <TabContent tab={t} />))}
      {active &&
        active.kind !== 'sql' &&
        panel(active.id, false, <TabContent key={active.id} tab={active} />)}
    </div>
  )
}
