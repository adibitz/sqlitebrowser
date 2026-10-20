import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { errorMessage } from '@/lib/errors'
import { completeOnboarding } from './completeOnboarding'

export function McpStep({ onBack }: { onBack: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function finish(): Promise<void> {
    setSaving(true)
    setSaveError(null)
    try {
      await completeOnboarding(enabled)
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Claude Code</h1>
        </CardTitle>
        <CardDescription>
          Let Claude Code read and change your databases and drive this window through MCP. It only listens on
          this computer, and writing changes to disk always asks you first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <RadioGroup
          aria-label="Claude Code"
          value={enabled ? 'on' : 'off'}
          onValueChange={(value) => setEnabled(value === 'on')}
          className="grid-cols-2"
        >
          <FieldLabel htmlFor="mcp-off">
            <Field orientation="horizontal">
              <RadioGroupItem id="mcp-off" value="off" />
              <FieldContent>
                <FieldTitle>Off</FieldTitle>
                <FieldDescription>Turn it on later in Preferences.</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="mcp-on">
            <Field orientation="horizontal">
              <RadioGroupItem id="mcp-on" value="on" />
              <FieldContent>
                <FieldTitle>On</FieldTitle>
                <FieldDescription>Copy the connect command in Preferences.</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        </RadioGroup>
        {saveError && (
          <p role="alert" className="text-micro text-destructive">
            Couldn't save the setting: {saveError}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Back
        </Button>
        <Button onClick={() => void finish()} disabled={saving}>
          {saving ? 'Saving…' : 'Finish'}
        </Button>
      </CardFooter>
    </Card>
  )
}
