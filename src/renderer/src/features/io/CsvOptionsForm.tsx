import {
  CONFLICT_ACTIONS,
  CSV_ENCODINGS,
  CSV_QUOTES,
  CSV_SEPARATORS,
  type ConflictAction,
  type CsvReadOptions,
} from '@shared/csv/csvOptions'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'

export interface CsvImportChoices {
  read: CsvReadOptions
  conflict: ConflictAction
  ignoreDefaults: boolean
  separateTables: boolean
}

interface CsvOptionsFormProps {
  value: CsvImportChoices
  multipleFiles: boolean
  onChange: (value: CsvImportChoices) => void
}

const encodings = CSV_ENCODINGS.map((e) => ({ label: e, value: e as string }))

/** The reading and import options of the CSV import (port of ImportCsvDialog._build). */
export function CsvOptionsForm({ value, multipleFiles, onChange }: CsvOptionsFormProps) {
  const read = (patch: Partial<CsvReadOptions>): void =>
    onChange({ ...value, read: { ...value.read, ...patch } })
  const check = (label: string, checked: boolean, set: (on: boolean) => void) => (
    <Label className="gap-2 font-normal">
      <Checkbox checked={checked} onCheckedChange={(on) => set(on === true)} />
      {label}
    </Label>
  )

  return (
    <div className="flex flex-col gap-3">
      {check('Column names in first line', value.read.header, (header) => read({ header }))}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Separator</FieldLabel>
          <ChoiceSelect
            label="Separator"
            size="sm"
            className="w-full"
            value={value.read.separator}
            choices={CSV_SEPARATORS}
            onChange={(separator) => read({ separator })}
          />
        </Field>
        <Field>
          <FieldLabel>Quote character</FieldLabel>
          <ChoiceSelect
            label="Quote character"
            size="sm"
            className="w-full"
            value={value.read.quote}
            choices={CSV_QUOTES}
            onChange={(quote) => read({ quote })}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Encoding</FieldLabel>
        <ChoiceSelect
          label="Encoding"
          size="sm"
          className="w-full"
          value={value.read.encoding}
          choices={encodings}
          onChange={(encoding) => read({ encoding })}
        />
      </Field>
      {check('Trim fields', value.read.trim, (trim) => read({ trim }))}
      {check('Replace other characters in column names with _', value.read.sanitizeNames, (sanitizeNames) =>
        read({ sanitizeNames }),
      )}
      {check('Disable data type detection', value.read.noTypeDetection, (noTypeDetection) =>
        read({ noTypeDetection }),
      )}
      {multipleFiles &&
        check('Separate table per file', value.separateTables, (separateTables) =>
          onChange({ ...value, separateTables }),
        )}
      {check('Ignore default values (existing tables)', value.ignoreDefaults, (ignoreDefaults) =>
        onChange({ ...value, ignoreDefaults }),
      )}
      <Field>
        <FieldLabel>On conflict</FieldLabel>
        <ChoiceSelect
          label="On conflict"
          size="sm"
          className="w-full"
          value={value.conflict}
          choices={CONFLICT_ACTIONS}
          onChange={(conflict) => onChange({ ...value, conflict })}
        />
      </Field>
    </div>
  )
}
