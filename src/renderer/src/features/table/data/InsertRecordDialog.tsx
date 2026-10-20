import { useState } from 'react'
import { KeyRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { findTable, objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { SqlBlock } from '@/components/SqlBlock'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { insertPreview, recordValues } from './recordValues'

/** Insert a record with values (port of dialogs/add_record.py). */
export function InsertRecordDialog({ table }: { table: ObjectRef }) {
  const close = useModalStore((s) => s.close)
  const info = useDbStore((s) => findTable(s.state.schemata, table))
  const columns = (info?.columns ?? []).filter((c) => !c.generated)
  const [texts, setTexts] = useState<string[]>(() => columns.map(() => ''))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const values = recordValues(
    columns.map((c) => c.name),
    texts,
  )

  const insert = async (): Promise<void> => {
    setSaving(true)
    try {
      await api.rows.add({ table, values })
      close()
      useDbStore.getState().bumpDataVersion()
      toast.success('Record inserted')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert record into {objectDisplayName(table)}</DialogTitle>
          <DialogDescription>
            Leave a value empty to use the column&apos;s default (or NULL). Type NULL for NULL.
          </DialogDescription>
        </DialogHeader>
        <form
          id="insert-record"
          className="min-h-0 overflow-auto rounded-card border"
          onSubmit={(e) => {
            e.preventDefault()
            void insert()
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Column</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((c, i) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      {c.primaryKey && (
                        <KeyRoundIcon className="size-3.5 text-warning" aria-label="Primary key" />
                      )}
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{c.type}</TableCell>
                  <TableCell className="p-1">
                    <Input
                      aria-label={`Value of ${c.name}`}
                      className="h-8"
                      autoFocus={i === 0}
                      placeholder={c.defaultValue ? `Default: ${c.defaultValue}` : undefined}
                      value={texts[i] ?? ''}
                      onChange={(e) => {
                        setTexts(texts.map((t, j) => (j === i ? e.target.value : t)))
                        setError('')
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </form>
        <section aria-label="SQL preview" className="flex flex-col gap-1">
          <h3 className="text-micro font-medium text-muted-foreground uppercase">SQL preview</h3>
          <SqlBlock
            sql={insertPreview(table, columns, values)}
            className="max-h-32 rounded-card border bg-card p-3 whitespace-pre-wrap"
          />
        </section>
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {error}
          </p>
          <Button variant="ghost" onClick={() => setTexts(columns.map(() => ''))}>
            Reset
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="insert-record" disabled={!info || saving}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
