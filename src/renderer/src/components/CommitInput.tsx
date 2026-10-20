import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

type CommitInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'defaultValue' | 'onChange'> & {
  value: string
  /** Called on Enter or blur when the text changed. If `value` doesn't change, the text resets. */
  onCommit: (text: string) => void
}

/** A text field that applies its text when you press Enter or leave it; Escape restores the value. */
export function CommitInput({ value, onCommit, onBlur, onKeyDown, ...props }: CommitInputProps) {
  const [text, setText] = useState(value)
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(value)
  }

  const commit = (): void => {
    if (text === value) return
    onCommit(text)
    setText(value)
  }

  return (
    <Input
      {...props}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => {
        commit()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape' && text !== value) {
          e.stopPropagation()
          setText(value)
        }
        onKeyDown?.(e)
      }}
    />
  )
}
