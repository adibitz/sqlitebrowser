import { useMemo } from 'react'
import { ClipboardCopyIcon, EyeIcon, ListOrderedIcon, PencilRulerIcon, TableIcon } from 'lucide-react'
import { findTable, objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { SqlBlock } from '@/components/SqlBlock'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createIndex, editTable } from '@/features/database/schemaActions'
import { copyText } from '@/lib/clipboard'
import { cn } from '@/lib/cn'
import { useDbStore } from '@/store/db'
import { useTabsStore, type BrowseState, type TableView } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { DataView } from './data/DataView'
import { StructureView } from './StructureView'

const KIND_LABEL = { table: 'Table', view: 'View', virtual: 'Virtual table', system: 'System table' } as const

function statement(sql: string): string {
  return sql ? sql.trim().replace(/;+$/, '') + ';' : ''
}

interface TableTabProps {
  tabId: string
  object: ObjectRef
  view: TableView
  browse: BrowseState
}

/** A table or view: data, structure and CREATE statement (port of table_tab.TableTab). */
export function TableTab({ tabId, object, view, browse }: TableTabProps) {
  const schemata = useDbStore((s) => s.state.schemata)
  const readOnly = useDbStore((s) => s.state.readOnly)
  const setTableView = useTabsStore((s) => s.setTableView)
  const fullScreen = useUiStore((s) => s.fullScreen)
  const table = findTable(schemata, object)
  const related = useMemo(() => {
    const schema = schemata.find((s) => s.name === object.schema)
    return {
      indices: schema?.indices.filter((i) => i.table === object.name) ?? [],
      triggers: schema?.triggers.filter((t) => t.table === object.name) ?? [],
    }
  }, [schemata, object])

  if (!table)
    return <p className="p-6 text-muted-foreground">{objectDisplayName(object)} no longer exists.</p>
  const Icon = table.kind === 'view' ? EyeIcon : TableIcon

  return (
    <Tabs
      value={view}
      onValueChange={(v) => setTableView(tabId, v as TableView)}
      className="h-full flex-col gap-0"
      aria-label={objectDisplayName(object)}
    >
      <div className={cn('flex items-center gap-3 border-b px-3 py-2', fullScreen && 'hidden')}>
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="truncate font-medium">{objectDisplayName(object)}</h2>
        <Badge>{KIND_LABEL[table.kind]}</Badge>
        {table.withoutRowid && <Badge variant="outline">Without rowid</Badge>}
        <TabsList className="ml-auto">
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="sql">SQL</TabsTrigger>
        </TabsList>
        {table.kind === 'table' && (
          <>
            <TooltipIconButton
              label="Modify table"
              disabled={readOnly}
              onClick={() => void editTable(object)}
            >
              <PencilRulerIcon />
            </TooltipIconButton>
            <TooltipIconButton label="Create index" disabled={readOnly} onClick={() => createIndex(object)}>
              <ListOrderedIcon />
            </TooltipIconButton>
          </>
        )}
        <TooltipIconButton
          label="Copy CREATE statement"
          disabled={!table.sql}
          onClick={() => void copyText(statement(table.sql), 'the CREATE statement')}
        >
          <ClipboardCopyIcon />
        </TooltipIconButton>
      </div>
      <TabsContent value="data" className="min-h-0">
        <DataView tabId={tabId} table={table} browse={browse} />
      </TabsContent>
      <TabsContent value="structure" className="min-h-0 overflow-auto">
        <StructureView table={table} indices={related.indices} triggers={related.triggers} />
      </TabsContent>
      <TabsContent value="sql" className="min-h-0">
        <SqlBlock sql={statement(table.sql)} className="h-full" />
      </TabsContent>
    </Tabs>
  )
}
