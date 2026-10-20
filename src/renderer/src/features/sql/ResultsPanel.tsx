import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DownloadIcon, TerminalSquareIcon } from 'lucide-react'
import { formatRows, ROW_FORMAT_EXTENSIONS, ROW_FORMATS, type RowFormat } from '@shared/format/rowExport'
import type { ColumnInfo } from '@shared/types/schema'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataGrid } from '@/features/table/data/DataGrid'
import { DEFAULT_COLUMN_WIDTH, type GridColumn } from '@/features/table/data/gridColumns'
import { RowCache } from '@/features/table/data/rowCache'
import { selectedColumns, selectedRows, type Selection } from '@/features/table/data/selection'
import { api } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { useSetting } from '@/store/settings'
import { toast } from 'sonner'
import type { ResultSource } from './useSqlRun'

function column(name: string, i: number, width: number | undefined): GridColumn {
  const info: ColumnInfo = {
    name,
    type: '',
    notNull: false,
    primaryKey: false,
    unique: false,
    defaultValue: '',
    check: '',
    collation: '',
    foreignKey: null,
    generated: null,
  }
  // Result rows have no key column, so values start at index 0.
  return { name, info, dataIndex: i, width: width ?? DEFAULT_COLUMN_WIDTH, numeric: false }
}

function cacheFor(source: ResultSource): RowCache {
  if (source.kind === 'static') {
    return new RowCache(
      async () => source.rows.length,
      async (offset, limit) => source.rows.slice(offset, offset + limit),
      errorMessage,
    )
  }
  return new RowCache(
    () => api.sql.count({ sql: source.sql }),
    (offset, limit) => api.sql.page({ sql: source.sql, offset, limit }),
    errorMessage,
  )
}

const FORMATS = Object.entries(ROW_FORMATS) as [RowFormat, string][]
export function ResultsPanel({ source }: { source: ResultSource | null }) {
  const compact = useSetting('General/uiDensity') === 'compact'
  const nullText = useSetting('databrowser/null_text') ?? 'NULL'
  const blobText = useSetting('databrowser/blob_text') ?? 'BLOB'
  const symbolLimit = useSetting('databrowser/symbol_limit') ?? 5000
  const display = useMemo(() => ({ nullText, blobText, symbolLimit }), [nullText, blobText, symbolLimit])
  const [selection, setSelection] = useState<Selection | null>(null)
  const [widths, setWidths] = useState<Record<string, number>>({})

  const cache = useMemo(() => (source ? cacheFor(source) : null), [source])
  useEffect(() => {
    if (!cache) return
    cache.start()
    return () => cache.dispose()
  }, [cache])
  useSyncExternalStore(cache?.subscribe ?? noopSubscribe, cache?.getVersion ?? zero)

  const columns = useMemo(
    () => (source?.columns ?? []).map((n, i) => column(n, i, widths[n])),
    [source, widths],
  )

  if (!source || !cache) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <TerminalSquareIcon className="size-5" />
        <p className="font-medium text-foreground">No results yet</p>
        <p>Run a query to see its results here.</p>
      </div>
    )
  }

  const total = cache.total
  const names = columns.map((c) => c.name)

  const copyCells = async (): Promise<void> => {
    if (!selection) return
    const rows = selectedRows(selection)
    const cols = selectedColumns(selection, columns.length).map((c) => columns[c]!)
    const loaded = await cache.range(rows[0]!, rows.at(-1)! + 1)
    const values = rows.map((r) => cols.map((c) => loaded[r - rows[0]!]?.[c.dataIndex] ?? null))
    await copyText(
      formatRows(
        'tsv',
        cols.map((c) => c.name),
        values,
        { header: false, newline: '\n' },
      ),
      'the cells',
    )
  }

  const exportAll = async (format: RowFormat): Promise<void> => {
    try {
      const rows = await cache.range(0, total ?? 0)
      const path = await api.files.saveText({
        title: 'Export results',
        defaultName: `results.${ROW_FORMAT_EXTENSIONS[format]}`,
        filters: [{ name: ROW_FORMATS[format], extensions: [ROW_FORMAT_EXTENSIONS[format]] }],
        content: formatRows(format, names, rows, { table: 'results' }),
      })
      if (path) toast.success(`Exported ${rows.length} rows`)
    } catch (err) {
      toast.error(`Couldn't export: ${errorMessage(err)}`)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-3 py-1">
        <h3 className="text-label font-medium text-muted-foreground">Results</h3>
        <span className="text-micro text-muted-foreground tabular-nums" aria-live="polite">
          {total === null
            ? 'Counting rows…'
            : `${total.toLocaleString()} row${total === 1 ? '' : 's'} · ${columns.length} column${columns.length === 1 ? '' : 's'}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="xs" variant="ghost" className="ml-auto" disabled={!total}>
                <DownloadIcon data-icon="inline-start" />
                Export
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {FORMATS.map(([key, label]) => (
              <DropdownMenuItem key={key} onClick={() => void exportAll(key)}>
                Results as {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {cache.error && (
        <p role="alert" className="border-b bg-destructive-tint px-3 py-2 text-destructive-ink">
          {cache.error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <DataGrid
          columns={columns}
          rowCount={total ?? 0}
          rowOffset={0}
          cache={cache}
          display={display}
          rowHeight={compact ? 24 : 28}
          filters={{}}
          filterDelay={0}
          filterEscape="\\"
          sort={[]}
          selection={selection}
          editing={null}
          hiddenCount={0}
          showFilterRow={false}
          columnMenus={false}
          canEdit={() => false}
          onFilter={noop}
          onSort={noop}
          onHideColumn={noop}
          onShowAllColumns={noop}
          onResizeColumn={(name, w) =>
            setWidths((prev) => {
              const next = { ...prev }
              if (w === null) delete next[name]
              else next[name] = Math.round(w)
              return next
            })
          }
          onSelect={setSelection}
          onEdit={noop}
          onCommit={noop}
          onOpenRecord={noop}
          onDeleteRows={noop}
          onCopy={() => void copyCells()}
          onSetNull={noop}
        />
      </div>
    </div>
  )
}

function noop(): void {}
const noopSubscribe = (): (() => void) => noop
const zero = (): number => 0
