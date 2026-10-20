import { useState } from 'react'
import { toast } from 'sonner'
import { MEMORY_DATABASE } from '@shared/types/db'
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
import { fileName } from '@/features/database/fileName'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useSettingsStore } from '@/store/settings'
import { saveSettings } from '@/store/settings'

type Content = 'all' | 'schema' | 'data'

const CONTENT = [
  { label: 'Schema and data', value: 'all' as Content },
  { label: 'Schema only', value: 'schema' as Content },
  { label: 'Data only', value: 'data' as Content },
]
const OLD_SCHEMA = [
  { label: 'Keep it (CREATE … IF NOT EXISTS)', value: true },
  { label: 'Replace it (DROP, then CREATE)', value: false },
]

/** Export the database as an SQL script (port of dialogs/export_sql.py). */
export function ExportSqlDialog() {
  const close = useModalStore((s) => s.close)
  const state = useDbStore((s) => s.state)
  const settings = useSettingsStore((s) => s.settings)
  const tables = (state.schemata.find((s) => s.name === 'main')?.tables ?? [])
    .filter((t) => t.kind === 'table' || t.kind === 'virtual')
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const [checked, setChecked] = useState<string[]>(tables)
  const [columnNames, setColumnNames] = useState(settings?.['exportsql/insertcolnames'] ?? false)
  const [multipleRows, setMultipleRows] = useState(settings?.['exportsql/insertmultiple'] ?? false)
  const [keepOriginal, setKeepOriginal] = useState(settings?.['exportsql/keeporiginal'] ?? false)
  const [content, setContent] = useState<Content>('all')
  const [keepOldSchema, setKeepOldSchema] = useState((settings?.['exportsql/oldschema'] ?? 0) === 0)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const run = async (): Promise<void> => {
    if (!checked.length) {
      setError('Please select at least one table.')
      return
    }
    setExporting(true)
    try {
      await saveSettings({
        'exportsql/insertcolnames': columnNames,
        'exportsql/insertmultiple': multipleRows,
        'exportsql/keeporiginal': keepOriginal,
        'exportsql/oldschema': keepOldSchema ? 0 : 1,
      })
      const base = state.path === MEMORY_DATABASE ? 'database' : fileName(state.path).replace(/\.[^.]+$/, '')
      const path = await api.io.exportSql({
        defaultName: `${base}.sql`,
        tables: tables.filter((t) => checked.includes(t)),
        insertColumnNames: columnNames,
        insertMultipleRows: multipleRows,
        keepOriginal,
        exportSchema: content !== 'data',
        exportData: content !== 'schema',
        keepOldSchema,
      })
      if (!path) return
      close()
      toast.success(`Exported to ${fileName(path)}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const option = (label: string, value: boolean, set: (v: boolean) => void) => (
    <Label className="gap-2 font-normal">
      <Checkbox checked={value} onCheckedChange={(on) => set(on === true)} />
      {label}
    </Label>
  )

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export database to SQL</DialogTitle>
          <DialogDescription>Writes an SQL script that recreates the selected tables.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <h3 className="text-micro font-medium text-muted-foreground uppercase">Tables</h3>
          <Button variant="link" size="xs" className="ml-auto" onClick={() => setChecked(tables)}>
            Select all
          </Button>
          <Button variant="link" size="xs" onClick={() => setChecked([])}>
            Deselect all
          </Button>
        </div>
        <ul aria-label="Tables" className="max-h-56 min-h-24 overflow-y-auto rounded-card border">
          {tables.map((name) => (
            <li key={name} className="border-b px-3 py-1.5 last:border-b-0">
              <Label className="gap-2 font-normal">
                <Checkbox
                  checked={checked.includes(name)}
                  onCheckedChange={(on) =>
                    setChecked(on === true ? [...checked, name] : checked.filter((c) => c !== name))
                  }
                />
                {name}
              </Label>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          {option('Keep column names in INSERT INTO', columnNames, setColumnNames)}
          {option('Multiple rows (VALUES) per INSERT statement', multipleRows, setMultipleRows)}
          {option('Keep original CREATE statements', keepOriginal, setKeepOriginal)}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Content</FieldLabel>
              <ChoiceSelect
                label="Content"
                size="sm"
                className="w-full"
                value={content}
                choices={CONTENT}
                onChange={setContent}
              />
            </Field>
            <Field>
              <FieldLabel>Existing schema</FieldLabel>
              <ChoiceSelect
                label="Existing schema"
                size="sm"
                className="w-full"
                value={keepOldSchema}
                choices={OLD_SCHEMA}
                onChange={setKeepOldSchema}
              />
            </Field>
          </div>
        </div>
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
