import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { SqlBlock } from '@/components/SqlBlock'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useTabsStore } from '@/store/tabs'
import { ColumnsEditor } from './ColumnsEditor'
import { ConstraintsEditor } from './ConstraintsEditor'
import {
  draftFromSql,
  emptyDraft,
  previewSql,
  setOptions,
  setSchema,
  setTableName,
  type TableDraft,
} from './tableDraft'
import { validateTable } from './validateTable'

interface EditTableDialogProps {
  /** The table to modify, or null to create one. */
  original: ObjectRef | null
  commitConfirmed: boolean
}

/** Create / modify table (port of dialogs/edit_table.py), with a live SQL preview. */
export function EditTableDialog({ original, commitConfirmed }: EditTableDialogProps) {
  const close = useModalStore((s) => s.close)
  const schemata = useDbStore((s) => s.state.schemata)
  const [draft, setDraft] = useState<TableDraft | null>(original ? null : emptyDraft())
  const [partial, setPartial] = useState(false)
  /** The name as typed (the draft keeps it trimmed). */
  const [nameText, setNameText] = useState('')
  const [selected, setSelected] = useState(-1)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!original) return
    let live = true
    api.schema.tableDefinition(original).then(
      (def) => {
        if (!live) return
        const loaded = draftFromSql(def.sql, original.schema)
        setDraft(loaded)
        setNameText(loaded.table.name)
        setPartial(!def.fullyParsed)
      },
      (err: unknown) => {
        toast.error(errorMessage(err))
        close()
      },
    )
    return () => {
      live = false
    }
  }, [original, close])

  const change = (next: TableDraft): void => {
    setDraft(next)
    setEditError('')
  }
  const problem = draft ? validateTable(draft, original, schemata) : ''
  const schemaNames = [...schemata.map((s) => s.name).filter((n) => n !== 'temp'), 'temp']

  const save = async (): Promise<void> => {
    if (!draft || problem) return
    setSaving(true)
    try {
      const result = await api.schema.saveTable({
        original,
        schema: draft.schema,
        sql: previewSql(draft),
        track: draft.track,
        commitConfirmed,
      })
      if (result.kind === 'needsCommit') {
        setEditError('Write or revert the pending changes first, then try again.')
        return
      }
      const ref = result.ref ?? { schema: draft.schema, name: draft.table.name }
      close()
      if (original) {
        useTabsStore.getState().retarget(original, ref)
        useDbStore.getState().bumpDataVersion()
        toast.success(`Table ${objectDisplayName(ref)} modified`)
      } else {
        useTabsStore.getState().openTable(ref)
        toast.success(`Table ${objectDisplayName(ref)} created`)
      }
    } catch (err) {
      setEditError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const title = original ? `Modify table ${objectDisplayName(original)}` : 'Create table'
  const message = editError || problem

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {partial
              ? "This table's CREATE statement couldn't be fully parsed. Changes may lose constraints that aren't shown here; check the SQL preview before saving."
              : 'Changes stay pending until you write them to the file.'}
          </DialogDescription>
        </DialogHeader>
        {!draft ? (
          <p className="py-8 text-center text-muted-foreground">Reading the table…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="table-name" className="text-muted-foreground">
                Table
              </Label>
              <Input
                id="table-name"
                className="max-w-xs"
                placeholder="table_name"
                autoFocus={!original}
                value={nameText}
                onChange={(e) => {
                  setNameText(e.target.value)
                  change(setTableName(draft, e.target.value))
                }}
              />
              <Label className="text-muted-foreground">Schema</Label>
              <Select
                items={schemaNames.map((n) => ({ value: n, label: n }))}
                value={draft.schema}
                onValueChange={(v) => change(setSchema(draft, String(v)))}
              >
                <SelectTrigger size="sm" className="min-w-28" aria-label="Schema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schemaNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label
                className="gap-2 font-normal"
                title="Store the table as a clustered index on its primary key"
              >
                <Checkbox
                  checked={draft.table.withoutRowid}
                  onCheckedChange={(on) => change(setOptions(draft, { withoutRowid: on === true }))}
                />
                WITHOUT ROWID
              </Label>
              <Label className="gap-2 font-normal" title="Enforce column data types (SQLite 3.37+)">
                <Checkbox
                  checked={draft.table.strict}
                  onCheckedChange={(on) => change(setOptions(draft, { strict: on === true }))}
                />
                STRICT
              </Label>
            </div>
            <Tabs defaultValue="columns" className="min-h-0 flex-1 gap-3">
              <TabsList>
                <TabsTrigger value="columns">Columns</TabsTrigger>
                <TabsTrigger value="constraints">Constraints</TabsTrigger>
              </TabsList>
              <TabsContent value="columns" className="flex min-h-48 flex-col">
                <ColumnsEditor
                  draft={draft}
                  selected={selected}
                  onSelect={setSelected}
                  onChange={change}
                  onError={setEditError}
                />
              </TabsContent>
              <TabsContent value="constraints" className="flex min-h-48 flex-col">
                <ConstraintsEditor draft={draft} onChange={change} onError={setEditError} />
              </TabsContent>
            </Tabs>
            <section aria-label="SQL preview" className="flex flex-col gap-1">
              <h3 className="text-micro font-medium text-muted-foreground uppercase">SQL preview</h3>
              <SqlBlock
                sql={previewSql(draft)}
                empty="Add a column to see the statement."
                className="max-h-40 rounded-card border bg-card p-3"
              />
            </section>
          </>
        )}
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {message}
          </p>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!draft || !!problem || saving} onClick={() => void save()}>
            {original ? 'Save changes' : 'Create table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
