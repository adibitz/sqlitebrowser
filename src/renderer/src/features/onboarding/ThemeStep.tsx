import { THEMES, type Theme } from '@shared/settings/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSetting, useSettingsStore } from '@/store/settings'
import { ThemePreview } from './ThemePreview'

const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export function ThemeStep({ onNext }: { onNext: () => void }) {
  const theme = useSetting('General/theme') ?? 'system'
  const update = useSettingsStore((s) => s.update)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Choose a theme</h1>
        </CardTitle>
        <CardDescription>
          System follows your computer. You can change this later in Preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          aria-label="Theme"
          value={theme}
          onValueChange={(value) => void update('General/theme', value as Theme)}
          className="grid-cols-3"
        >
          {THEMES.map((option) => (
            <FieldLabel key={option} htmlFor={`theme-${option}`}>
              <Field orientation="horizontal" className="flex-col items-stretch gap-3">
                <ThemePreview theme={option} />
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`theme-${option}`} value={option} />
                  <FieldContent>
                    <FieldTitle>{THEME_LABELS[option]}</FieldTitle>
                  </FieldContent>
                </div>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onNext}>Continue</Button>
      </CardFooter>
    </Card>
  )
}
