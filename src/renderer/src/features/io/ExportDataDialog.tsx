import { useState } from 'react'
import { toast } from 'sonner'
import { CSV_NEWLINES, CSV_QUOTES, CSV_SEPARATORS } from '@shared/csv/csvOptions'
import { ROW_FORMATS, type RowFormat } from '@shared/format/rowExport'
import type { ExportOptions, ExportSource } from '@shared/ipc/io'
import { objectDisplayName, sameObject, type ObjectRef } from '@shared/types/schema'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useSettingsStore } from '@/store/settings'
import { exportOptionsFrom, saveExportOptions } from './ioSettings'

interface ExportDataDialogProps {
  /** One fixed thing to export (a filtered table, a query); null to pick tables and views. */
  source: ExportSource | null
  selected: ObjectRef | null
}

const FORMATS = Object.entries(ROW_FORMATS) as [RowFormat, string][]
const FORMAT_TABS: Record<RowFormat, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
  sql: 'SQL',
  md: 'Markdown',
}

function describe(source: ExportSource): string {
  if (source.kind === 'browse')
    return `${objectDisplayName(source.query.table)} as filtered and sorted in its tab`
  if (source.kind === 'sql') return 'the rows of the query result'
  return objectDisplayName(source.ref)
}

/** Export tables, views or a query result to files (port of dialogs/export_data.py, all row formats). */
export function ExportDataDialog({ source, selected }: ExportDataDialogProps) {
  const close = useModalStore((s) => s.close)
  const schemata = useDbStore((s) => s.state.schemata)
  const objects = schemata.flatMap((s) =>
    s.tables
      .filter((t) => t.kind !== 'system')
      .map((t) => ({ schema: s.name, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  )
  const [format, setFormat] = useState<RowFormat>('csv')
  const [options, setOptions] = useState<ExportOptions>(() => {
    const settings = useSettingsStore.getState().settings
    return settings
      ? exportOptionsFrom(settings)
      : { header: true, separator: ',', quote: '"', newline: '\r\n', prettyJson: true }
  })
  const [checked, setChecked] = useState<ObjectRef[]>(() => {
    const first = selected ?? objects[0]
    return first ? [first] : []
  })
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const set = (patch: Partial<ExportOptions>): void => setOptions({ ...options, ...patch })
  const isChecked = (ref: ObjectRef): boolean => checked.some((c) => sameObject(c, ref))

  const run = async (): Promise<void> => {
    const sources: ExportSource[] = source ? [source] : checked.map((ref) => ({ kind: 'table', ref }))
    if (!sources.length) {
      setError('Select at least one table or view.')
      return
    }
    setExporting(true)
    try {
      await saveExportOptions(options)
      const result = await api.io.exportData({ sources, format, options })
      if (!result) return
      close()
      toast.success(`Exported ${result.files.length} file${result.files.length === 1 ? '' : 's'}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const delimited = format === 'csv' || format === 'tsv'

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>
            {source
              ? `Exports ${describe(source)}.`
              : 'Select several to write one file per table into a folder.'}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={format} onValueChange={(v) => setFormat(v as RowFormat)}>
          <TabsList aria-label="Format">
            {FORMATS.map(([key, label]) => (
              <TabsTrigger key={key} value={key} title={label}>
                {FORMAT_TABS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {!source && (
          <ul aria-label="Tables and views" className="max-h-56 min-h-24 overflow-y-auto rounded-card border">
            {objects.map((ref) => (
              <li key={`${ref.schema}.${ref.name}`} className="border-b px-3 py-1.5 last:border-b-0">
                <Label className="gap-2 font-normal">
                  <Checkbox
                    checked={isChecked(ref)}
                    onCheckedChange={(on) =>
                      setChecked(on === true ? [...checked, ref] : checked.filter((c) => !sameObject(c, ref)))
                    }
                  />
                  {objectDisplayName(ref)}
                </Label>
              </li>
            ))}
          </ul>
        )}
        {delimited && (
          <div className="flex flex-col gap-3">
            <Label className="gap-2 font-normal">
              <Checkbox checked={options.header} onCheckedChange={(on) => set({ header: on === true })} />
              Column names in first line
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {format === 'csv' && (
                <>
                  <Field>
                    <FieldLabel>Separator</FieldLabel>
                    <ChoiceSelect
                      label="Separator"
                      size="sm"
                      className="w-full"
                      value={options.separator}
                      choices={CSV_SEPARATORS.filter((s) => s.value !== ' ')}
                      onChange={(separator) => set({ separator })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Quote character</FieldLabel>
                    <ChoiceSelect
                      label="Quote character"
                      size="sm"
                      className="w-full"
                      value={options.quote}
                      choices={CSV_QUOTES}
                      onChange={(quote) => set({ quote })}
                    />
                  </Field>
                </>
              )}
              <Field>
                <FieldLabel>New line</FieldLabel>
                <ChoiceSelect
                  label="New line"
                  size="sm"
                  className="w-full"
                  value={options.newline}
                  choices={CSV_NEWLINES}
                  onChange={(newline) => set({ newline })}
                />
              </Field>
            </div>
          </div>
        )}
        {format === 'json' && (
          <Label className="gap-2 font-normal">
            <Checkbox
              checked={options.prettyJson}
              onCheckedChange={(on) => set({ prettyJson: on === true })}
            />
            Pretty print
          </Label>
        )}
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {error}
          </p>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={exporting} onClick={() => void run()}>
            Export…
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
