import type { PragmaDef, PragmaValue } from '@shared/schema/pragmas'
import { ChoiceSelect, type Choice } from '@/components/ChoiceSelect'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface PragmaFieldProps {
  def: PragmaDef
  label: string
  value: PragmaValue
  disabled: boolean
  onChange: (value: PragmaValue) => void
}

/** The editor for one pragma: checkbox, choice list or number. */
export function PragmaField({ def, label, value, disabled, onChange }: PragmaFieldProps) {
  const { editor } = def
  if (editor.kind === 'bool') {
    return (
      <Checkbox
        aria-label={label}
        checked={Number(value) !== 0}
        disabled={disabled}
        onCheckedChange={(on) => onChange(on === true ? 1 : 0)}
      />
    )
  }
  if (editor.kind === 'int') {
    return (
      <Input
        aria-label={label}
        type="number"
        className="h-8 w-40 tabular-nums"
        min={editor.min}
        max={editor.max}
        step={1}
        disabled={disabled}
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isInteger(n))
            onChange(Math.min(editor.max, Math.max(editor.min, n)))
        }}
      />
    )
  }
  // Choice lists: enum pragmas are stored as the index, the others as the choice itself.
  const choices: Choice<PragmaValue>[] =
    editor.kind === 'enum'
      ? editor.choices.map((label, i) => ({ label, value: i }))
      : editor.choices.map((c) => ({ label: String(c), value: c }))
  return (
    <ChoiceSelect
      label={label}
      size="sm"
      className="w-40"
      value={value}
      choices={choices}
      disabled={disabled}
      onChange={onChange}
    />
  )
}
