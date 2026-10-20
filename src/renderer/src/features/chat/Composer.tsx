import { useState } from 'react'
import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ComposerProps {
  busy: boolean
  disabled: boolean
  onSend: (text: string) => void
  onStop: () => void
}

/** The message box: Enter sends, Shift+Enter starts a new line; Stop while a reply runs. */
export function Composer({ busy, disabled, onSend, onStop }: ComposerProps) {
  const [text, setText] = useState('')
  const send = (): void => {
    const message = text.trim()
    if (!message || busy || disabled) return
    onSend(message)
    setText('')
  }

  return (
    <form
      className="flex items-end gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <Textarea
        aria-label="Message"
        placeholder={disabled ? 'Choose a model first' : 'Ask about this database…'}
        className="max-h-40 min-h-10 flex-1 resize-none"
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
      />
      {busy ? (
        <Button type="button" variant="secondary" size="icon-sm" aria-label="Stop" onClick={onStop}>
          <SquareIcon />
        </Button>
      ) : (
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={disabled || !text.trim()}>
          <ArrowUpIcon />
        </Button>
      )}
    </form>
  )
}
