import { toast } from 'sonner'
import { isBinary } from '@shared/format/data'
import { formatRows, ROW_FORMAT_EXTENSIONS, ROW_FORMATS, type RowFormat } from '@shared/format/rowExport'
import type { BrowseQuery } from '@shared/types/rows'
import type { TableInfo } from '@shared/types/schema'
import type { SqlValue } from '@shared/types/values'
import { exportData } from '@/features/io/ioActions'
import { api } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { confirm } from '@/store/dialogs'
import { useDbStore } from '@/store/db'
import { useTabsStore, type BrowseState } from '@/store/tabs'
import { editText } from './cellDisplay'
import type { GridColumn } from './gridColumns'
import type { RowCache } from './rowCache'
import { cellSelection, selectedColumns, selectedRows, type CellPos, type Selection } from './selection'

export interface DataContext {
  tabId: string
  table: TableInfo
  browse: BrowseState
  query: BrowseQuery
  cache: RowCache
  columns: GridColumn[]
  rowOffset: number
  viewCount: number
  selection: Selection | null
  setSelection: (s: Selection | null) => void
  reload: () => void
}

/** Everything the toolbar, grid, inspector and selection bar can do to the data (port of TableTab). */
export function useDataActions(ctx: DataContext) {
  const { table, browse, cache, columns, rowOffset, selection } = ctx
  const ref = { schema: table.schema, name: table.name }
  const readOnly = useDbStore((s) => s.state.readOnly)
  const editable =
    !readOnly && table.kind !== 'system' && (table.kind !== 'view' || browse.pseudoPk.length > 0)
  const rowAt = (row: number): SqlValue[] | undefined => cache.rowAt(rowOffset + row)

  const canEdit = (pos: CellPos): boolean => {
    const column = columns[pos.col]
    const value = rowAt(pos.row)?.[column?.dataIndex ?? 0]
    return (
      editable &&
      !!column &&
      !column.info.generated &&
      !column.formatted &&
      value !== undefined &&
      !isBinary(value ?? null)
    )
  }

  /** Stores a value in one cell; resolves false when it failed (the error is shown). */
  const setValue = async (pos: CellPos, value: string | null | Uint8Array): Promise<boolean> => {
    const column = columns[pos.col]
    const row = rowAt(pos.row)
    if (!column || !row) return false
    try {
      const stored = await api.rows.update({
        table: ref,
        column: column.name,
        key: row[0] ?? null,
        value,
        pseudoPk: browse.pseudoPk,
      })
      cache.patch(rowOffset + pos.row, column.dataIndex, stored)
      return true
    } catch (err) {
      toast.error(`Couldn't change the data: ${errorMessage(err)}`)
      return false
    }
  }

  const commit = (pos: CellPos, text: string): void => {
    const column = columns[pos.col]
    const old = rowAt(pos.row)?.[column?.dataIndex ?? 0]
    if (old !== undefined && old !== null && editText(old) === text) return
    if (old === null && text === '') return
    void setValue(pos, text)
  }

  const goToLastRow = (total: number): void => {
    const page = browse.pageSize ? Math.floor((total - 1) / browse.pageSize) : 0
    useTabsStore.getState().updateBrowse(ctx.tabId, { page })
    ctx.reload()
    ctx.setSelection(cellSelection({ row: total - 1 - page * browse.pageSize, col: 0 }))
  }

  const addRecord = async (): Promise<void> => {
    try {
      await api.rows.add({ table: ref })
      goToLastRow((cache.total ?? 0) + 1)
    } catch (err) {
      toast.error(`Couldn't add a record: ${errorMessage(err)}`)
    }
  }

  const duplicateRecord = async (): Promise<void> => {
    const key = selection ? rowAt(selection.focus.row)?.[0] : undefined
    if (key === undefined) return
    try {
      await api.rows.duplicate({ table: ref, key })
      goToLastRow((cache.total ?? 0) + 1)
    } catch (err) {
      toast.error(`Couldn't duplicate the record: ${errorMessage(err)}`)
    }
  }

  const deleteRows = async (): Promise<void> => {
    const rows = selectedRows(selection)
    const keys = rows.map((r) => rowAt(r)?.[0]).filter((k): k is SqlValue => k !== undefined)
    if (!keys.length || !editable) return
    const choice = await confirm({
      title: keys.length === 1 ? 'Delete this record?' : `Delete ${keys.length} records?`,
      description: 'You can still undo this with Revert changes until you write the changes.',
      actions: [{ id: 'delete', label: 'Delete', variant: 'destructive' }],
    })
    if (choice !== 'delete') return
    try {
      await api.rows.remove({ table: ref, keys, pseudoPk: browse.pseudoPk })
      const remaining = Math.max(0, (cache.total ?? 0) - keys.length)
      const lastPage = browse.pageSize ? Math.max(0, Math.ceil(remaining / browse.pageSize) - 1) : 0
      useTabsStore.getState().updateBrowse(ctx.tabId, { page: Math.min(browse.page, lastPage) })
      ctx.setSelection(null)
      ctx.reload()
    } catch (err) {
      toast.error(`Couldn't delete: ${errorMessage(err)}`)
    }
  }

  const setSelectionNull = async (): Promise<void> => {
    if (!selection || !editable) return
    for (const row of selectedRows(selection)) {
      for (const col of selectedColumns(selection, columns.length)) {
        if (columns[col]?.info.generated) continue
        if (!(await setValue({ row, col }, null))) return
      }
    }
  }

  /** Whole selected rows (all table columns), loading any that aren't cached. */
  const selectedRecords = async (): Promise<SqlValue[][]> => {
    const rows = selectedRows(selection)
    if (!rows.length) return []
    const loaded = await cache.range(rowOffset + rows[0]!, rowOffset + rows.at(-1)! + 1)
    const wanted = new Set(rows.map((r) => r - rows[0]!))
    return loaded.filter((_, i) => wanted.has(i)).map((r) => r.slice(1))
  }

  const copySelection = async (format: RowFormat | 'cells'): Promise<void> => {
    if (!selection) return
    if (format === 'cells') {
      const cols = selectedColumns(selection, columns.length).map((c) => columns[c]!)
      const rows = selectedRows(selection)
      const loaded = await cache.range(rowOffset + rows[0]!, rowOffset + rows.at(-1)! + 1)
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
      return
    }
    const records = await selectedRecords()
    const names = table.columns.map((c) => c.name)
    await copyText(
      formatRows(format, names, records, { table: table.name, newline: '\n' }),
      `${records.length} rows as ${ROW_FORMATS[format]}`,
    )
  }

  const exportRows = async (which: 'page' | 'selected', format: RowFormat): Promise<void> => {
    const records =
      which === 'selected'
        ? await selectedRecords()
        : (await cache.range(rowOffset, rowOffset + ctx.viewCount)).map((r) => r.slice(1))
    const content = formatRows(
      format,
      table.columns.map((c) => c.name),
      records,
      { table: table.name },
    )
    try {
      const path = await api.files.saveText({
        title: which === 'selected' ? 'Export selected rows' : 'Export current page',
        defaultName: `${table.name}.${ROW_FORMAT_EXTENSIONS[format]}`,
        filters: [{ name: ROW_FORMATS[format], extensions: [ROW_FORMAT_EXTENSIONS[format]] }],
        content,
      })
      if (path) toast.success(`Exported ${records.length} rows`)
    } catch (err) {
      toast.error(`Couldn't export: ${errorMessage(err)}`)
    }
  }

  /** Every row as filtered and sorted, through the Export data dialog. */
  const exportAll = (): void => exportData({ kind: 'browse', query: ctx.query })

  return {
    editable,
    canEdit,
    setValue,
    commit,
    addRecord,
    duplicateRecord,
    deleteRows,
    setSelectionNull,
    copySelection,
    exportRows,
    exportAll,
  }
}

export type DataActions = ReturnType<typeof useDataActions>
