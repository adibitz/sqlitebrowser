import { useState } from 'react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { EmptyNote } from '@/components/EmptyNote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { addCheck, addForeignKey, addUnique, constraintRows, removeConstraint } from './tableConstraints'
import type { EditResult, TableDraft } from './tableDraft'

type AddKind = 'unique' | 'check' | 'foreignKey'

interface ConstraintsEditorProps {
  draft: TableDraft
  onChange: (draft: TableDraft) => void
  onError: (message: string) => void
}

const ADD_LABELS: Record<AddKind, string> = {
  unique: 'Unique',
  check: 'Check',
  foreignKey: 'Foreign key',
}

/** The Constraints page: table-level keys, foreign keys and checks. */
export function ConstraintsEditor({ draft, onChange, onError }: ConstraintsEditorProps) {
  const [selected, setSelected] = useState(-1)
  const [adding, setAdding] = useState<AddKind | null>(null)
  const rows = constraintRows(draft.table)

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(ADD_LABELS) as AddKind[]).map((kind) => (
          <Button
            key={kind}
            variant={adding === kind ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setAdding(adding === kind ? null : kind)}
          >
            <PlusIcon /> {ADD_LABELS[kind]}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={selected < 0 || selected >= rows.length}
          onClick={() => {
            onChange(removeConstraint(draft, selected))
            setSelected(-1)
          }}
        >
          <MinusIcon /> Remove
        </Button>
      </div>
      {adding && (
        <AddConstraintForm
          key={adding}
          kind={adding}
          columns={draft.table.fieldNames()}
          onAdd={(a, b) => {
            const result: EditResult =
              adding === 'unique'
                ? addUnique(draft, a)
                : adding === 'check'
                  ? addCheck(draft, a)
                  : addForeignKey(draft, a, b)
            if (result.error) {
              onError(result.error)
              return
            }
            onChange(result.draft)
            setAdding(null)
          }}
          onCancel={() => setAdding(null)}
        />
      )}
      {rows.length ? (
        <div className="min-h-0 overflow-auto rounded-card border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-40">Columns</TableHead>
                <TableHead className="w-32">Name</TableHead>
                <TableHead>SQL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow
                  key={i}
                  tabIndex={0}
                  aria-selected={i === selected}
                  className={cn('cursor-default', i === selected && 'bg-surface-2')}
                  onClick={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                >
                  <TableCell className="font-medium">{row.kind}</TableCell>
                  <TableCell>{row.columns}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="max-w-0 truncate font-mono" title={row.sql}>
                    {row.sql}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyNote>No table constraints. Column keys and checks are set on the Columns page.</EmptyNote>
      )}
    </div>
  )
}

interface AddConstraintFormProps {
  kind: AddKind
  columns: string[]
  onAdd: (first: string, second: string) => void
  onCancel: () => void
}

function AddConstraintForm({ kind, columns, onAdd, onCancel }: AddConstraintFormProps) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const firstLabel = kind === 'check' ? 'Expression' : 'Columns'
  const firstPlaceholder = kind === 'check' ? 'price > 0' : columns.slice(0, 2).join(', ')

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-card border bg-surface-2 p-2"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd(first, second)
      }}
    >
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-label text-muted-foreground">
        {firstLabel}
        <Input
          autoFocus
          className="font-mono"
          placeholder={firstPlaceholder}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
        />
      </label>
      {kind === 'foreignKey' && (
        <label className="flex min-w-60 flex-[2] flex-col gap-1 text-label text-muted-foreground">
          References
          <Input
            className="font-mono"
            placeholder="other_table(a, b) ON DELETE CASCADE"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
          />
        </label>
      )}
      <Button type="submit" size="sm">
        Add
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}
