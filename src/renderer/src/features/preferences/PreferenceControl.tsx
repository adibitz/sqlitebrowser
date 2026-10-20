import { FolderOpenIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { McpConnectionControl } from './McpConnectionControl'
import type { PreferenceField } from './preferencePages'

interface PreferenceControlProps {
  field: PreferenceField
  value: unknown
  onChange: (value: unknown) => void
}

const idFor = (field: PreferenceField): string => `pref-${field.key.replace('/', '-')}`

/** One setting's label and control. */
export function PreferenceControl({ field, value, onChange }: PreferenceControlProps) {
  const id = idFor(field)
  if (field.kind === 'mcpConnection') return <McpConnectionControl />
  if (field.kind === 'bool') {
    return (
      <Label className="col-span-2 gap-2 font-normal">
        <Checkbox checked={value === true} onCheckedChange={(on) => onChange(on === true)} />
        {field.label}
      </Label>
    )
  }
  const label = (
    <Label
      htmlFor={id}
      className={cn(
        'text-muted-foreground',
        field.kind === 'sql' || field.kind === 'extensions' ? 'self-start pt-2' : '',
      )}
    >
      {field.label}
    </Label>
  )
  if (field.kind === 'int') {
    return (
      <>
        {label}
        <span className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            className="h-8 w-32 tabular-nums"
            min={field.min}
            max={field.max}
            step={1}
            value={String(value ?? '')}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (e.target.value !== '' && Number.isInteger(n))
                onChange(Math.min(field.max, Math.max(field.min, n)))
            }}
          />
          {field.suffix && <span className="text-label text-muted-foreground">{field.suffix}</span>}
        </span>
      </>
    )
  }
  if (field.kind === 'text') {
    return (
      <>
        {label}
        <Input
          id={id}
          className="h-8 max-w-60"
          maxLength={field.maxLength}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </>
    )
  }
  if (field.kind === 'choice') {
    return (
      <>
        {label}
        <ChoiceSelect
          id={id}
          label={field.label}
          size="sm"
          className="w-72"
          value={value as string | number}
          choices={field.choices}
          onChange={onChange}
        />
      </>
    )
  }
  if (field.kind === 'folder') {
    return (
      <>
        {label}
        <span className="flex gap-2">
          <Input
            id={id}
            className="h-8 flex-1"
            placeholder="Your home folder"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const folder = await api.files.chooseFolder({
                title: field.label,
                defaultPath: String(value ?? ''),
              })
              if (folder) onChange(folder)
            }}
          >
            <FolderOpenIcon /> Browse…
          </Button>
        </span>
      </>
    )
  }
  if (field.kind === 'sql') {
    return (
      <>
        {label}
        <Textarea
          id={id}
          className="min-h-20 font-mono"
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </>
    )
  }
  const list = Array.isArray(value) ? (value as string[]) : []
  return (
    <>
      {label}
      <div className="flex flex-col gap-2">
        <ul id={id} aria-label={field.label} className="min-h-16 rounded-card border">
          {list.length === 0 && <li className="px-3 py-2 text-muted-foreground">None</li>}
          {list.map((path) => (
            <li key={path} className="flex items-center gap-2 border-b px-3 py-1 last:border-b-0">
              <span className="min-w-0 flex-1 truncate font-mono text-label" title={path}>
                {path}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${path}`}
                onClick={() => onChange(list.filter((p) => p !== path))}
              >
                <MinusIcon />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={async () => {
            const path = await api.files.chooseExtension()
            if (path && !list.includes(path)) onChange([...list, path])
          }}
        >
          <PlusIcon /> Add extension…
        </Button>
      </div>
    </>
  )
}
