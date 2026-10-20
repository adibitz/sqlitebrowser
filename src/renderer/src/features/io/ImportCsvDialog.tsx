import { useState } from 'react'
import { toast } from 'sonner'
import { tableNameForFile } from '@shared/csv/csvFields'
import { findTable } from '@shared/types/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { fileName } from '@/features/database/fileName'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useSettingsStore } from '@/store/settings'
import { useTabsStore } from '@/store/tabs'
import { CsvOptionsForm, type CsvImportChoices } from './CsvOptionsForm'
import { CsvPreviewTable } from './CsvPreviewTable'
import { csvReadOptionsFrom, saveCsvReadOptions } from './ioSettings'
import { useCsvPreview } from './useCsvPreview'

function initialChoices(): CsvImportChoices {
  const settings = useSettingsStore.getState().settings
  return {
    read: settings
      ? csvReadOptionsFrom(settings)
      : {
          header: true,
          separator: ',',
          quote: '"',
          encoding: 'UTF-8',
          trim: true,
          noTypeDetection: false,
          sanitizeNames: false,
        },
    conflict: '',
    ignoreDefaults: false,
    separateTables: settings?.['importcsv/separatetables'] ?? false,
  }
}

/** Import CSV files into new or existing tables, with a live preview (port of dialogs/import_csv.py). */
export function ImportCsvDialog({ paths }: { paths: string[] }) {
  const close = useModalStore((s) => s.close)
  const schemata = useDbStore((s) => s.state.schemata)
  const [choices, setChoices] = useState(initialChoices)
  const [current, setCurrent] = useState(0)
  const [tableName, setTableName] = useState(() => tableNameForFile(paths[0] ?? ''))
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const path = paths[current] ?? paths[0] ?? ''
  const { preview, error: previewError } = useCsvPreview(path, choices.read)

  const multiple = paths.length > 1
  const perFile = multiple && choices.separateTables
  const targetFor = (p: string): string => (perFile ? tableNameForFile(p) : tableName.trim())
  const target = targetFor(path)
  const appends = !!target && findTable(schemata, { schema: 'main', name: target }) !== null

  const selectFile = (index: number): void => {
    setCurrent(index)
    if (perFile) setTableName(tableNameForFile(paths[index] ?? ''))
  }

  const run = async (): Promise<void> => {
    if (!perFile && !tableName.trim()) {
      setError('Please enter a table name.')
      return
    }
    setImporting(true)
    setError('')
    const imported: string[] = []
    let rows = 0
    try {
      await saveCsvReadOptions(choices.read, choices.separateTables)
      for (const p of paths) {
        const table = targetFor(p)
        const result = await api.io.importCsv({
          path: p,
          table,
          options: choices.read,
          conflict: choices.conflict,
          ignoreDefaults: choices.ignoreDefaults,
        })
        rows += result.rows
        imported.push(table)
      }
    } catch (err) {
      setError(errorMessage(err))
      return
    } finally {
      setImporting(false)
      if (imported.length) useDbStore.getState().bumpDataVersion()
    }
    close()
    const last = imported.at(-1)
    if (last) useTabsStore.getState().openTable({ schema: 'main', name: last })
    toast.success(`Imported ${rows.toLocaleString()} rows. Write changes to keep them.`)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Rows go into a new table, or are added to an existing table with the same number of columns.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr] gap-6">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {multiple && (
              <ul aria-label="Files" className="max-h-32 overflow-y-auto rounded-card border">
                {paths.map((p, i) => (
                  <li key={p}>
                    <button
                      type="button"
                      aria-current={i === current}
                      className={cn(
                        'w-full truncate px-3 py-1.5 text-left text-body-sm hover:bg-surface-2',
                        i === current && 'bg-surface-2 font-medium',
                      )}
                      onClick={() => selectFile(i)}
                    >
                      {fileName(p)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Field>
              <FieldLabel htmlFor="csv-table">Table name</FieldLabel>
              <Input
                id="csv-table"
                value={perFile ? target : tableName}
                disabled={perFile}
                onChange={(e) => {
                  setTableName(e.target.value)
                  setError('')
                }}
              />
            </Field>
            <CsvOptionsForm value={choices} multipleFiles={multiple} onChange={setChoices} />
          </div>
          <section aria-label="Preview" className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-micro font-medium text-muted-foreground uppercase">Preview</h3>
              {target && (
                <Badge variant={appends ? 'warning' : 'signal'} className="ml-auto">
                  {appends ? `Adds rows to the existing table ${target}` : `New table ${target}`}
                </Badge>
              )}
            </div>
            {previewError ? (
              <p className="text-label text-destructive">{previewError}</p>
            ) : preview ? (
              <CsvPreviewTable preview={preview} fileName={fileName(path)} />
            ) : (
              <p className="text-muted-foreground">Reading the file…</p>
            )}
          </section>
        </div>
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {error}
          </p>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={importing || !!previewError} onClick={() => void run()}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
