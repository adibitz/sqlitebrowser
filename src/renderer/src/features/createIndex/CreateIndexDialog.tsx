import { useState } from 'react'
import { toast } from 'sonner'
import { objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { ChoiceSelect, type Choice } from '@/components/ChoiceSelect'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import {
  indexableTables,
  indexDraftFor,
  indexSql,
  validateIndex,
  type IndexDraft,
  type IndexOrder,
} from './indexDraft'

const refKey = (ref: ObjectRef): string => `${ref.schema}\u0000${ref.name}`

const ORDER_CHOICES: Choice<IndexOrder>[] = [
  { label: 'Default order', value: '' },
  { label: 'ASC', value: 'ASC' },
  { label: 'DESC', value: 'DESC' },
]

/** Create index (port of dialogs/edit_index.py). */
export function CreateIndexDialog({ table }: { table: ObjectRef | null }) {
  const close = useModalStore((s) => s.close)
  const schemata = useDbStore((s) => s.state.schemata)
  const tables = indexableTables(schemata)
  const [draft, setDraft] = useState<IndexDraft>(() => indexDraftFor(schemata, table ?? tables[0] ?? null))
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const problem = validateIndex(draft, schemata)

  const change = (patch: Partial<IndexDraft>): void => {
    setDraft({ ...draft, ...patch })
    setSaveError('')
  }
  const setColumn = (index: number, patch: Partial<IndexDraft['columns'][number]>): void =>
    change({ columns: draft.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)) })

  const save = async (): Promise<void> => {
    if (problem) return
    setSaving(true)
    try {
      await api.schema.createIndex({ sql: indexSql(draft) })
      close()
      toast.success(`Index ${draft.name.trim()} created`)
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create index</DialogTitle>
          <DialogDescription>Check the columns to index; their order follows the list.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="index-name">Name</FieldLabel>
            <Input
              id="index-name"
              autoFocus
              placeholder={draft.table ? `idx_${draft.table.name}` : 'idx_table_column'}
              value={draft.name}
              onChange={(e) => change({ name: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Table</FieldLabel>
            <Select
              items={tables.map((t) => ({ value: refKey(t), label: objectDisplayName(t) }))}
              value={draft.table ? refKey(draft.table) : null}
              onValueChange={(v) => {
                const next = tables.find((t) => refKey(t) === v) ?? null
                setDraft(indexDraftFor(schemata, next, draft))
              }}
            >
              <SelectTrigger className="w-full" aria-label="Table">
                <SelectValue placeholder="Choose a table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={refKey(t)} value={refKey(t)}>
                    {objectDisplayName(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="col-span-2">
            <FieldLabel htmlFor="index-where">Where</FieldLabel>
            <Input
              id="index-where"
              className="font-mono"
              placeholder="optional, e.g. deleted_at IS NULL (partial index)"
              value={draft.where}
              onChange={(e) => change({ where: e.target.value })}
            />
          </Field>
          <Label className="col-span-2 gap-2 font-normal">
            <Checkbox checked={draft.unique} onCheckedChange={(on) => change({ unique: on === true })} />
            Unique
          </Label>
        </div>
        <ul aria-label="Columns" className="min-h-24 overflow-y-auto rounded-card border">
          {draft.columns.map((c, i) => (
            <li key={c.name} className="flex items-center gap-3 border-b px-3 py-1.5 last:border-b-0">
              <Label className="flex-1 gap-2 font-normal">
                <Checkbox
                  checked={c.checked}
                  onCheckedChange={(on) => setColumn(i, { checked: on === true })}
                />
                {c.name}
              </Label>
              <ChoiceSelect
                label={`Order of ${c.name}`}
                size="sm"
                className="w-36"
                value={c.order}
                choices={ORDER_CHOICES}
                onChange={(order) => setColumn(i, { order })}
              />
            </li>
          ))}
        </ul>
        <section aria-label="SQL preview" className="flex flex-col gap-1">
          <h3 className="text-micro font-medium text-muted-foreground uppercase">SQL preview</h3>
          <SqlBlock
            sql={indexSql(draft)}
            empty="Check a column to see the statement."
            className="max-h-32 rounded-card border bg-card p-3"
          />
        </section>
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {saveError || problem}
          </p>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!!problem || saving} onClick={() => void save()}>
            Create index
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
