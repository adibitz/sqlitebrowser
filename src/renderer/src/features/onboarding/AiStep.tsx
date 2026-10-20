import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { api } from '@/lib/api'
import { fastTransition } from '@/lib/motion'
import { initialAiDraft, validateAiDraft, type AiDraft, type AiDraftErrors } from './aiSetup'
import { completeOnboarding } from './completeOnboarding'
import { ProviderFields } from './ProviderFields'

export function AiStep({ onBack }: { onBack: () => void }) {
  const [draft, setDraft] = useState<AiDraft>(initialAiDraft)
  const [errors, setErrors] = useState<AiDraftErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [canEncryptKeys, setCanEncryptKeys] = useState(true)

  useEffect(() => {
    void api.ai.canEncryptKeys().then(setCanEncryptKeys)
  }, [])

  // After the first submit, errors clear live as fields are fixed.
  function change(next: AiDraft): void {
    setDraft(next)
    if (submitted) {
      const result = validateAiDraft(next)
      setErrors(result.ok ? {} : result.errors)
    }
  }

  async function finish(): Promise<void> {
    setSubmitted(true)
    const result = validateAiDraft(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await completeOnboarding(result.request)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <Card>
      <form
        noValidate
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          void finish()
        }}
      >
        <CardHeader>
          <CardTitle>
            <h1>AI assistant</h1>
          </CardTitle>
          <CardDescription>
            Ask questions about your data in plain language. Nothing is sent anywhere while it's off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadioGroup
            aria-label="AI assistant"
            value={draft.enabled ? 'on' : 'off'}
            onValueChange={(value) => change({ ...draft, enabled: value === 'on' })}
            className="grid-cols-2"
          >
            <FieldLabel htmlFor="ai-off">
              <Field orientation="horizontal">
                <RadioGroupItem id="ai-off" value="off" />
                <FieldContent>
                  <FieldTitle>Off</FieldTitle>
                  <FieldDescription>Turn it on later in Preferences.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="ai-on">
              <Field orientation="horizontal">
                <RadioGroupItem id="ai-on" value="on" />
                <FieldContent>
                  <FieldTitle>On</FieldTitle>
                  <FieldDescription>Use Claude or a local model.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          </RadioGroup>

          <AnimatePresence initial={false}>
            {draft.enabled && (
              <motion.div
                key="provider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fastTransition}
              >
                <ProviderFields
                  draft={draft}
                  errors={errors}
                  canEncryptKeys={canEncryptKeys}
                  onChange={change}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {saveError && (
            <p role="alert" className="text-micro text-destructive">
              Couldn't save the AI settings: {saveError}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Back
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Finish'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
