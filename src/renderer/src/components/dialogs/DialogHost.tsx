import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useDialogStore, type PromptRequest } from '@/store/dialogs'

/** Renders the confirm/prompt dialog requested through store/dialogs. Mounted once in the shell. */
export function DialogHost() {
  const current = useDialogStore((s) => s.current)
  const settle = useDialogStore((s) => s.settle)

  return (
    <AlertDialog open={current !== null} onOpenChange={(open) => !open && settle(null)}>
      {current && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current.title}</AlertDialogTitle>
            {current.description && <AlertDialogDescription>{current.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {current.kind === 'confirm' ? (
            <AlertDialogFooter>
              <Button variant="ghost" onClick={() => settle(null)}>
                {current.cancelLabel ?? 'Cancel'}
              </Button>
              {current.actions.map((action, i) => (
                <Button
                  key={action.id}
                  variant={action.variant ?? (i === current.actions.length - 1 ? 'default' : 'secondary')}
                  autoFocus={i === current.actions.length - 1}
                  onClick={() => settle(action.id)}
                >
                  {action.label}
                </Button>
              ))}
            </AlertDialogFooter>
          ) : (
            <PromptForm key={current.title} request={current} onDone={settle} />
          )}
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}

function PromptForm({ request, onDone }: { request: PromptRequest; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(request.initialValue ?? '')
  const [error, setError] = useState('')

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = value.trim()
        if (!trimmed) {
          setError(`Enter ${request.label.toLowerCase()}.`)
          return
        }
        onDone(trimmed)
      }}
    >
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="prompt-input">{request.label}</FieldLabel>
        <Input
          id="prompt-input"
          autoFocus
          value={value}
          aria-invalid={!!error}
          onChange={(e) => {
            setValue(e.target.value)
            if (e.target.value.trim()) setError('')
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <AlertDialogFooter>
        <Button type="button" variant="ghost" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button type="submit">{request.confirmLabel}</Button>
      </AlertDialogFooter>
    </form>
  )
}
