import { useEffect, useState } from 'react'
import { KeyRoundIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  initialAiDraft,
  PROVIDER_LABELS,
  validateAiDraft,
  type AiDraftErrors,
} from '@/features/onboarding/aiSetup'
import { ProviderFields } from '@/features/onboarding/ProviderFields'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useChatStore } from '@/store/chat'
import { saveSettings, useSettingsStore } from '@/store/settings'

/** The AI providers: added and removed at once (they live in their own table, not in settings). */
export function AiProvidersControl() {
  const providers = useChatStore((s) => s.providers)
  const loadProviders = useChatStore((s) => s.loadProviders)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ ...initialAiDraft, enabled: true })
  const [errors, setErrors] = useState<AiDraftErrors>({})
  const [canEncrypt, setCanEncrypt] = useState(true)

  useEffect(() => {
    void loadProviders()
    void api.ai.canEncryptKeys().then(setCanEncrypt)
  }, [loadProviders])

  const add = async (): Promise<void> => {
    const result = validateAiDraft(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    if (!result.request) return
    try {
      const saved = await api.ai.saveProvider(result.request)
      if (!useSettingsStore.getState().settings?.['ai/activeProviderId']) {
        await saveSettings({ 'ai/activeProviderId': saved.id, 'ai/activeModel': saved.defaultModel })
      }
      await loadProviders()
      setAdding(false)
      setDraft({ ...initialAiDraft, enabled: true })
      setErrors({})
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const remove = async (id: number): Promise<void> => {
    try {
      await api.ai.deleteProvider({ id })
      await useSettingsStore.getState().load()
      await loadProviders()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="col-span-2 flex flex-col gap-3">
      <ul aria-label="AI providers" className="rounded-card border">
        {providers.length === 0 && <li className="px-3 py-2 text-muted-foreground">No providers yet.</li>}
        {providers.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{p.name}</span>
              <span className="truncate text-label text-muted-foreground">
                {PROVIDER_LABELS[p.kind]} · {p.defaultModel}
              </span>
            </span>
            {p.hasApiKey && (
              <KeyRoundIcon className="size-3.5 text-muted-foreground" aria-label="API key stored" />
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${p.name}`}
              onClick={() => void remove(p.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="flex flex-col gap-3 rounded-card border p-3">
          <ProviderFields draft={draft} errors={errors} canEncryptKeys={canEncrypt} onChange={setDraft} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void add()}>
              Add provider
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" className="self-start" onClick={() => setAdding(true)}>
          <PlusIcon /> Add provider…
        </Button>
      )}
    </div>
  )
}
