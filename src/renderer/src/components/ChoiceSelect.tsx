import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Choice<T> {
  label: string
  value: T
}

interface ChoiceSelectProps<T> {
  /** Accessible name of the trigger. */
  label: string
  value: T
  choices: readonly Choice<T>[]
  onChange: (value: T) => void
  id?: string
  size?: 'sm' | 'default'
  className?: string
  disabled?: boolean
}

/** A select over any values (empty strings and numbers included); options are matched by position. */
export function ChoiceSelect<T>({
  label,
  value,
  choices,
  onChange,
  id,
  size = 'default',
  className,
  disabled,
}: ChoiceSelectProps<T>) {
  const items = choices.map((c, i) => ({ value: String(i), label: c.label }))
  const index = choices.findIndex((c) => c.value === value)
  return (
    <Select
      items={items}
      value={index >= 0 ? String(index) : null}
      disabled={disabled}
      onValueChange={(v) => {
        const choice = choices[Number(v)]
        if (choice) onChange(choice.value)
      }}
    >
      <SelectTrigger id={id} size={size} className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
