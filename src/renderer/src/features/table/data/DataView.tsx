import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TableInfo } from '@shared/types/schema'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useSetting } from '@/store/settings'
import { useModalStore } from '@/store/modals'
import { usePlotSourcesStore } from '@/store/plotSources'
import { useTabsStore, type BrowseState } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { Inspector, type InspectedCell } from '../inspector/Inspector'
import type { DisplayOptions } from './cellDisplay'
import { DataGrid, type EditingCell } from './DataGrid'
import { DataToolbar } from './DataToolbar'
import { FilterChips } from './FilterChips'
import { gridColumns } from './gridColumns'
import { PaginationFooter } from './PaginationFooter'
import { RecordDialog } from './RecordDialog'
import { cellSelection, selectionSummary, type Selection } from './selection'
import { SelectionBar } from './SelectionBar'
import { useBrowseQuery } from './useBrowseQuery'
import { useDataActions } from './useDataActions'
import { useRowSource } from './useRowSource'

/** The Data view of a table tab: toolbar, chips, grid (+ inspector), selection bar, pagination. */
export function DataView({ tabId, table, browse }: { tabId: string; table: TableInfo; browse: BrowseState }) {
  const updateBrowse = useTabsStore((s) => s.updateBrowse)
  const inspectorVisible = useUiStore((s) => s.inspectorVisible)
  const compact = useSetting('General/uiDensity') === 'compact'
  const filterDelay = useSetting('databrowser/filter_delay') ?? 200
  const filterEscape = useSetting('databrowser/filter_escape') ?? '\\'
  const nullText = useSetting('databrowser/null_text') ?? 'NULL'
  const blobText = useSetting('databrowser/blob_text') ?? 'BLOB'
  const symbolLimit = useSetting('databrowser/symbol_limit') ?? 5000
  const display = useMemo<DisplayOptions>(
    () => ({ nullText, blobText, symbolLimit }),
    [nullText, blobText, symbolLimit],
  )

  const [reloadToken, setReloadToken] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [recordIndex, setRecordIndex] = useState<number | null>(null)

  const query = useBrowseQuery(table, browse)
  const setPlotSource = usePlotSourcesStore((s) => s.set)
  useEffect(() => {
    const columns = table.columns.map((c) => c.name)
    setPlotSource(tabId, { kind: 'browse', name: table.name, query, columns })
    return () => setPlotSource(tabId, null)
  }, [setPlotSource, tabId, table, query])
  const cache = useRowSource(query, reloadToken)
  const columns = useMemo(() => gridColumns(table, browse), [table, browse])
  const total = cache.total
  const rowOffset = browse.pageSize ? browse.page * browse.pageSize : 0
  const viewCount =
    total === null ? 0 : browse.pageSize ? Math.max(0, Math.min(browse.pageSize, total - rowOffset)) : total

  const onBrowse = useCallback(
    (patch: Partial<BrowseState>) => {
      setSelection(null)
      setEditing(null)
      updateBrowse(tabId, patch)
    },
    [tabId, updateBrowse],
  )
  const reload = useCallback(() => setReloadToken((t) => t + 1), [])
  const actions = useDataActions({
    tabId,
    table,
    browse,
    query,
    cache,
    columns,
    rowOffset,
    viewCount,
    selection,
    setSelection,
    reload,
  })

  const focus = selection?.focus
  const focusColumn = focus ? columns[focus.col] : undefined
  const focusRow = focus ? cache.rowAt(rowOffset + focus.row) : undefined
  const inspected: InspectedCell | null =
    focus && focusColumn && focusRow
      ? {
          column: focusColumn.name,
          rowNumber: rowOffset + focus.row + 1,
          value: focusRow[focusColumn.dataIndex] ?? null,
          editable: actions.editable && !focusColumn.info.generated,
        }
      : null

  const multiple =
    selection !== null &&
    (selection.kind === 'rows' ||
      selection.anchor.row !== selection.focus.row ||
      selection.anchor.col !== selection.focus.col)

  const grid = (
    <DataGrid
      columns={columns}
      rowCount={viewCount}
      rowOffset={rowOffset}
      cache={cache}
      display={display}
      rowHeight={compact ? 24 : 28}
      filters={browse.filters}
      filterDelay={filterDelay}
      filterEscape={filterEscape}
      sort={browse.sort}
      selection={selection}
      editing={editing}
      hiddenCount={browse.hiddenColumns.length}
      canEdit={actions.canEdit}
      onFilter={(column, text) => {
        const filters = { ...browse.filters }
        if (text) filters[column] = text
        else delete filters[column]
        onBrowse({ filters, page: 0 })
      }}
      onSort={(sort) => onBrowse({ sort, page: 0 })}
      onHideColumn={(column) => onBrowse({ hiddenColumns: [...browse.hiddenColumns, column] })}
      onShowAllColumns={() => onBrowse({ hiddenColumns: [] })}
      onFormatColumn={(column, kind) =>
        useModalStore.getState().show({
          kind: kind === 'display' ? 'displayFormat' : 'condFormats',
          tabId,
          table: { schema: table.schema, name: table.name },
          column,
        })
      }
      onResizeColumn={(column, width) => {
        const columnWidths = { ...browse.columnWidths }
        if (width === null) delete columnWidths[column]
        else columnWidths[column] = Math.round(width)
        updateBrowse(tabId, { columnWidths })
      }}
      onSelect={(s) => {
        if (s && browse.rowSelection && s.kind === 'cells' && s.anchor.row === s.focus.row) {
          setSelection({ kind: 'rows', rows: [s.focus.row], anchor: s.focus.row, focus: s.focus })
        } else setSelection(s)
      }}
      onEdit={setEditing}
      onCommit={actions.commit}
      onOpenRecord={(row) => setRecordIndex(rowOffset + row)}
      onDeleteRows={() => void actions.deleteRows()}
      onCopy={() => void actions.copySelection('cells')}
      onSetNull={() => void actions.setSelectionNull()}
    />
  )

  return (
    <div className="flex h-full flex-col">
      <DataToolbar
        table={table}
        browse={browse}
        actions={actions}
        hasSelection={selection !== null}
        filterDelay={filterDelay}
        onBrowse={onBrowse}
        onReload={reload}
      />
      <FilterChips browse={browse} onBrowse={onBrowse} />
      {cache.error && (
        <p role="alert" className="border-b bg-destructive-tint px-3 py-2 text-destructive-ink">
          {cache.error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        {inspectorVisible ? (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel id="grid" minSize={320}>
              {grid}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="inspector" defaultSize={320} minSize={240} maxSize="50%">
              <Inspector
                cell={inspected}
                onApply={(value) => (focus ? actions.setValue(focus, value) : Promise.resolve(false))}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          grid
        )}
      </div>
      {multiple && (
        <SelectionBar
          summary={selectionSummary(selection, columns.length)}
          actions={actions}
          onClear={() => setSelection(null)}
        />
      )}
      <PaginationFooter
        total={total}
        pageSize={browse.pageSize}
        page={browse.page}
        filtered={Object.keys(browse.filters).length > 0 || browse.globalFilter !== ''}
        onPageSize={(pageSize) =>
          onBrowse({ pageSize, page: pageSize ? Math.floor(rowOffset / pageSize) : 0 })
        }
        onPage={(page) => onBrowse({ page })}
        onGoToRow={(n) => {
          const page = browse.pageSize ? Math.floor((n - 1) / browse.pageSize) : 0
          onBrowse({ page })
          setSelection(cellSelection({ row: n - 1 - page * browse.pageSize, col: 0 }))
        }}
      />
      <RecordDialog
        table={table}
        cache={cache}
        index={recordIndex}
        total={total ?? 0}
        display={display}
        onIndex={setRecordIndex}
      />
    </div>
  )
}
