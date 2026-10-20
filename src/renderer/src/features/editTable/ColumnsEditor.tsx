import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { CommitInput } from '@/components/CommitInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import {
  addColumn,
  canAutoIncrement,
  columnForeignKey,
  DATATYPES,
  DATATYPES_STRICT,
  moveColumn,
  removeColumn,
  renameColumn,
  setAutoIncrement,
  setColumnForeignKey,
  togglePrimaryKey,
  updateColumn,
  type EditResult,
  type TableDraft,
} from './tableDraft'

interface ColumnsEditorProps {
  draft: TableDraft
  selected: number
  onSelect: (index: number) => void
  onChange: (draft: TableDraft) => void
  onError: (message: string) => void
}

const TYPES_LIST_ID = 'edit-table-types'
const cellInput = 'h-8 rounded-sm px-2 font-mono text-body-sm'

const flags = [
  { key: 'NN', label: 'not null' },
  { key: 'PK', label: 'primary key' },
  { key: 'AI', label: 'autoincrement' },
  { key: 'U', label: 'unique' },
] as const

/** The Columns page of the table dialog: one editable row per column. */
export function ColumnsEditor({ draft, selected, onSelect, onChange, onError }: ColumnsEditorProps) {
  const { table } = draft
  const pk = table.primaryKeyNames()
  const autoIncrement = table.primaryKey()?.autoIncrement ?? false

  const apply = (result: EditResult): void => {
    if (result.error) onError(result.error)
    else onChange(result.draft)
  }
  const add = (): void => {
    onChange(addColumn(draft))
    onSelect(table.fields.length)
  }
  const remove = (): void => {
    onChange(removeColumn(draft, selected))
    onSelect(Math.min(selected, table.fields.length - 2))
  }
  const move = (delta: number): void => {
    onChange(moveColumn(draft, selected, delta))
    onSelect(selected + delta)
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="secondary" size="sm" onClick={add}>
          <PlusIcon /> Add column
        </Button>
        <Button variant="ghost" size="sm" disabled={selected < 0} onClick={remove}>
          <MinusIcon /> Remove
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Move column up"
          disabled={selected <= 0}
          onClick={() => move(-1)}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Move column down"
          disabled={selected < 0 || selected >= table.fields.length - 1}
          onClick={() => move(1)}
        >
          <ArrowDownIcon />
        </Button>
        <p className="ml-auto text-label text-muted-foreground">
          NN not null · PK primary key · AI autoincrement · U unique
        </p>
      </div>
      <datalist id={TYPES_LIST_ID}>
        {(table.strict ? DATATYPES_STRICT : DATATYPES).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="min-h-0 overflow-auto rounded-card border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Name</TableHead>
              <TableHead className="w-32">Type</TableHead>
              {flags.map((f) => (
                <TableHead key={f.key} className="w-10 text-center" title={f.label}>
                  {f.key}
                </TableHead>
              ))}
              <TableHead>Default</TableHead>
              <TableHead>Check</TableHead>
              <TableHead className="w-24">Collation</TableHead>
              <TableHead title="table(column) [ON DELETE …]">Foreign key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.fields.map((f, i) => {
              const label = `Column ${i + 1}`
              const flagValues = {
                NN: f.notNull,
                PK: pk.includes(f.name),
                AI: autoIncrement && pk.includes(f.name),
                U: f.unique,
              }
              const flagChange = {
                NN: (on: boolean) => onChange(updateColumn(draft, i, { notNull: on })),
                PK: () => onChange(togglePrimaryKey(draft, i)),
                AI: (on: boolean) => onChange(setAutoIncrement(draft, i, on)),
                U: (on: boolean) => onChange(updateColumn(draft, i, { unique: on })),
              }
              return (
                <TableRow
                  key={i}
                  aria-selected={i === selected}
                  className={cn(i === selected && 'bg-surface-2')}
                  onFocus={() => onSelect(i)}
                  onPointerDown={() => onSelect(i)}
                >
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} name`}
                      className={cellInput}
                      value={f.name}
                      onCommit={(text) => apply(renameColumn(draft, i, text))}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} type`}
                      className={cellInput}
                      list={TYPES_LIST_ID}
                      value={f.type}
                      onCommit={(text) => onChange(updateColumn(draft, i, { type: text }))}
                    />
                  </TableCell>
                  {flags.map(({ key, label: what }) => (
                    <TableCell key={key} className="p-1 text-center">
                      <Checkbox
                        aria-label={`${label} ${what}`}
                        className="mx-auto"
                        checked={flagValues[key]}
                        disabled={key === 'AI' && !canAutoIncrement(table, f.name)}
                        onCheckedChange={(on) => flagChange[key](on === true)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} default`}
                      className={cellInput}
                      value={f.generated ? `AS (${f.generated.expression})` : f.defaultValue}
                      readOnly={!!f.generated}
                      title={f.generated ? 'Generated column (edit the SQL to change it)' : undefined}
                      onCommit={(text) => onChange(updateColumn(draft, i, { defaultValue: text }))}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} check`}
                      className={cellInput}
                      value={f.check}
                      onCommit={(text) => onChange(updateColumn(draft, i, { check: text }))}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} collation`}
                      className={cellInput}
                      value={f.collation}
                      onCommit={(text) => onChange(updateColumn(draft, i, { collation: text }))}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <CommitInput
                      aria-label={`${label} foreign key`}
                      className={cellInput}
                      value={columnForeignKey(table, f.name)}
                      onCommit={(text) => apply(setColumnForeignKey(draft, i, text))}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
