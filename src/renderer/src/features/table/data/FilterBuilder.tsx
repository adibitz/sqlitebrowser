import { useState } from 'react'
import {
  FILTER_OPERATORS,
  buildFilterText,
  filterToSqlCondition,
  parseFilterText,
  type FilterOperator,
} from '@shared/format/filters'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterBuilderProps {
  column: string
  value: string
  escape: string
  onApply: (text: string) => void
}

const operatorItems = FILTER_OPERATORS.map((o) => ({ value: o.key, label: o.label }))

/** Column › condition › value, with a live SQL preview (port of dialogs/filter_builder.py). */
export function FilterBuilder({ column, value, escape, onApply }: FilterBuilderProps) {
  const [initialOp, initialV1, initialV2] = parseFilterText(value)
  const [op, setOp] = useState<FilterOperator>(initialOp)
  const [v1, setV1] = useState(initialV1)
  const [v2, setV2] = useState(initialV2)
  const valueCount = FILTER_OPERATORS.find((o) => o.key === op)!.values
  const text = buildFilterText(op, v1, v2)
  const condition = filterToSqlCondition(text, escape)

  return (
    <form
      className="flex w-72 flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(text)
      }}
    >
      <p className="font-medium">Filter {column}</p>
      <Field>
        <FieldLabel htmlFor="filter-op">Condition</FieldLabel>
        <Select items={operatorItems} value={op} onValueChange={(v) => setOp(v as FilterOperator)}>
          <SelectTrigger id="filter-op" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operatorItems.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {valueCount >= 1 && (
        <Field>
          <FieldLabel htmlFor="filter-v1">{valueCount === 2 ? 'From' : 'Value'}</FieldLabel>
          <Input id="filter-v1" autoFocus value={v1} onChange={(e) => setV1(e.target.value)} />
        </Field>
      )}
      {valueCount === 2 && (
        <Field>
          <FieldLabel htmlFor="filter-v2">To</FieldLabel>
          <Input id="filter-v2" value={v2} onChange={(e) => setV2(e.target.value)} />
        </Field>
      )}
      <p
        className="rounded-control bg-surface-2 px-2 py-1.5 font-mono text-micro text-muted-foreground"
        aria-live="polite"
      >
        {condition ? `WHERE "${column}" ${condition}` : 'No filter'}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="xs" onClick={() => onApply('')}>
          Clear
        </Button>
        <Button type="submit" size="xs">
          Apply
        </Button>
      </div>
    </form>
  )
}
