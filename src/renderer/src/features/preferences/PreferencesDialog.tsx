import { useState } from 'react'
import { toast } from 'sonner'
import { settingsSchema, type SettingKey, type Settings } from '@shared/settings/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { useModalStore } from '@/store/modals'
import { saveSettings, useSettingsStore } from '@/store/settings'
import { PreferenceControl } from './PreferenceControl'
import { PREFERENCE_KEYS, PREFERENCE_PAGES } from './preferencePages'

type Draft = Partial<Record<SettingKey, unknown>>

function currentValues(): Draft {
  const settings = useSettingsStore.getState().settings
  return Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, settings?.[key]]))
}

function defaultValues(): Draft {
  return Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, settingsSchema.shape[key].parse(undefined)]))
}

/** Preferences, page by page (port of dialogs/preferences.py). Nothing changes until Save. */
export function PreferencesDialog() {
  const close = useModalStore((s) => s.close)
  const [page, setPage] = useState(PREFERENCE_PAGES[0]!.id)
  const [draft, setDraft] = useState<Draft>(currentValues)
  const [saving, setSaving] = useState(false)
  const current = PREFERENCE_PAGES.find((p) => p.id === page) ?? PREFERENCE_PAGES[0]!

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await saveSettings(draft as Partial<Settings>)
      close()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex h-[min(42rem,85vh)] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription className="sr-only">Settings of the app, by topic.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[11rem_1fr] gap-6">
          <nav aria-label="Preference pages" className="flex flex-col gap-0.5">
            {PREFERENCE_PAGES.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-current={p.id === page ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-control px-3 py-1.5 text-left text-body-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                    p.id === page && 'bg-surface-2 font-medium text-foreground',
                  )}
                  onClick={() => setPage(p.id)}
                >
                  <Icon className="size-4" />
                  {p.title}
                </button>
              )
            })}
          </nav>
          <section
            aria-labelledby="pref-page-title"
            className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1"
          >
            <div>
              <h3 id="pref-page-title" className="text-body font-medium">
                {current.title}
              </h3>
              {current.note && <p className="text-label text-muted-foreground">{current.note}</p>}
            </div>
            <div className="grid grid-cols-[minmax(9rem,auto)_1fr] items-center gap-x-4 gap-y-3">
              {current.fields.map((field) => (
                <PreferenceControl
                  key={`${field.kind}:${field.key}`}
                  field={field}
                  value={draft[field.key]}
                  onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                />
              ))}
            </div>
          </section>
        </div>
        <DialogFooter className="items-center">
          <Button variant="ghost" className="mr-auto" onClick={() => setDraft(defaultValues())}>
            Restore defaults
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
