import { useEffect, useRef, useState } from 'react'

interface CellEditorProps {
  initial: string
  numeric: boolean
  /** Enter / blur commit; `move` says where the focus goes next. */
  onCommit: (text: string, move: 'down' | 'right' | 'none') => void
  onCancel: () => void
}

/** Inline editor over a grid cell: Enter saves and moves down, Tab saves and moves right, Esc cancels. */
export function CellEditor({ initial, numeric, onCommit, onCancel }: CellEditorProps) {
  const [text, setText] = useState(initial)
  const done = useRef(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])

  const finish = (move: 'down' | 'right' | 'none'): void => {
    if (done.current) return
    done.current = true
    onCommit(text, move)
  }

  return (
    <input
      ref={ref}
      value={text}
      aria-label="Edit cell"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => finish('none')}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          finish('down')
        } else if (e.key === 'Tab') {
          e.preventDefault()
          finish('right')
        } else if (e.key === 'Escape') {
          e.preventDefault()
          done.current = true
          onCancel()
        }
      }}
      className={
        'absolute inset-0 z-20 h-full w-full border-2 border-ring bg-card px-2 text-body-sm text-foreground outline-none ' +
        (numeric ? 'text-right tabular-nums' : '')
      }
    />
  )
}
