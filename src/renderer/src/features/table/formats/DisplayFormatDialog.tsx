import { useState } from 'react'
import { DISPLAY_PRESETS, matchPreset, presetSelector } from '@shared/format/displayFormat'
import { escapeIdentifier } from '@shared/sqlb/identifier'
import type { ObjectRef } from '@shared/types/schema'
import { ChoiceSelect, type Choice } from '@/components/ChoiceSelect'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useModalStore } from '@/store/modals'
import { useTabsStore } from '@/store/tabs'
import { browseOf } from './browseOf'

const PRESET_CHOICES: Choice<string>[] = [
  { label: 'Default', value: 'default' },
  ...DISPLAY_PRESETS.flatMap((p) => (p ? [{ label: p.label, value: p.key }] : [])),
  { label: 'Custom', value: 'custom' },
]

interface DisplayFormatDialogProps {
  tabId: string
  table: ObjectRef
  column: string
}

/** How one column's values are shown (port of dialogs/display_format.py). */
export function DisplayFormatDialog({ tabId, table, column }: DisplayFormatDialogProps) {
  const close = useModalStore((s) => s.close)
  const current = browseOf(tabId)?.displayFormats[column] ?? ''
  const [expr, setExpr] = useState(current || escapeIdentifier(column))
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const preset = matchPreset(expr.trim(), column)

  const save = async (): Promise<void> => {
    const text = expr.trim()
    const format = matchPreset(text, column) === 'default' ? '' : text
    if (format) {
      setChecking(true)
      try {
        const problem = await api.rows.validateDisplayFormat({ table, column, selector: format })
        if (problem) {
          setError(problem)
          return
        }
      } catch (err) {
        setError(errorMessage(err))
        return
      } finally {
        setChecking(false)
      }
    }
    const browse = browseOf(tabId)
    if (browse) {
      const displayFormats = { ...browse.displayFormats }
      if (format) displayFormats[column] = format
      else delete displayFormats[column]
      useTabsStore.getState().updateBrowse(tabId, { displayFormats, page: 0 })
    }
    close()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Display format of {column}</DialogTitle>
          <DialogDescription>
            Changes how values are shown; the stored data stays as it is. Formatted cells are read-only.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field>
            <FieldLabel>Format</FieldLabel>
            <ChoiceSelect
              label="Format"
              className="w-full"
              value={preset}
              choices={PRESET_CHOICES}
              onChange={(key) => {
                if (key !== 'custom') setExpr(presetSelector(key, column))
                setError('')
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="display-expr">SQL expression</FieldLabel>
            <Input
              id="display-expr"
              className="font-mono"
              value={expr}
              onChange={(e) => {
                setExpr(e.target.value)
                setError('')
              }}
            />
          </Field>
          <DialogFooter className="items-center">
            <p role="alert" className="mr-auto text-label whitespace-pre-line text-destructive">
              {error}
            </p>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={checking}>
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
