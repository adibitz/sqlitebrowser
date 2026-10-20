import { useEffect, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { ProviderSummary } from '@shared/ai/providers'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { saveSettings } from '@/store/settings'

interface ModelPickerProps {
  providers: ProviderSummary[]
  provider: ProviderSummary | null
  model: string
}

/** Shows which model answers ("Claude · claude-sonnet-5-5") and lets you pick another. */
export function ModelPicker({ providers, provider, model }: ModelPickerProps) {
  const [models, setModels] = useState<string[]>([])
  const [listError, setListError] = useState('')
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(model)
  const [shown, setShown] = useState(model)
  if (model !== shown) {
    setShown(model)
    setTyped(model)
  }

  useEffect(() => {
    if (!open || !provider) return
    let live = true
    api.ai.listModels({ providerId: provider.id }).then(
      (ids) => {
        if (!live) return
        setModels(ids)
        setListError('')
      },
      (err: unknown) => live && setListError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [open, provider])

  const choose = (providerId: number, nextModel: string): void =>
    void saveSettings({ 'ai/activeProviderId': providerId, 'ai/activeModel': nextModel })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Model"
        className="flex min-w-0 items-center gap-1 rounded-full border px-2.5 py-1 text-label hover:bg-surface-2"
      >
        <span className="truncate">{provider ? `${provider.name} · ${model}` : 'Choose a model'}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3">
        <Field>
          <FieldLabel>Provider</FieldLabel>
          <ChoiceSelect
            label="Provider"
            size="sm"
            className="w-full"
            value={provider?.id ?? null}
            choices={providers.map((p) => ({ label: p.name, value: p.id as number | null }))}
            onChange={(id) => {
              const next = providers.find((p) => p.id === id)
              if (next) choose(next.id, next.defaultModel)
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="chat-model">Model</FieldLabel>
          <Input
            id="chat-model"
            list="chat-models"
            className="font-mono"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onBlur={() => provider && typed.trim() && choose(provider.id, typed.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && provider && typed.trim()) {
                choose(provider.id, typed.trim())
                setOpen(false)
              }
            }}
          />
          <datalist id="chat-models">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <FieldDescription>{listError || 'Pick from the list or type any model id.'}</FieldDescription>
        </Field>
      </PopoverContent>
    </Popover>
  )
}
