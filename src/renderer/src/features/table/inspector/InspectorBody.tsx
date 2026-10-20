import { useState } from 'react'
import { BracesIcon, DownloadIcon, Undo2Icon, UploadIcon, WrapTextIcon } from 'lucide-react'
import { valueToText } from '@shared/format/data'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { formatShortcut } from '@/lib/shortcuts'
import type { InspectedCell } from './Inspector'
import { ImagePreview } from './ImagePreview'
import {
  autoMode,
  jsonError,
  textForMode,
  typeInfo,
  valueFromEditor,
  type InspectorMode,
} from './inspectorValue'

interface InspectorBodyProps {
  cell: InspectedCell
  onApply: (value: string | null | Uint8Array) => Promise<boolean>
}

/** The value editor of the inspector; remounted (fresh state) for every selected cell. */
export function InspectorBody({ cell, onApply }: InspectorBodyProps) {
  const [mode, setMode] = useState<InspectorMode>(() => autoMode(cell.value))
  const [text, setText] = useState(() => textForMode(cell.value, autoMode(cell.value)))
  const [pendingBlob, setPendingBlob] = useState<Uint8Array | null>(null)
  const [dirty, setDirty] = useState(false)
  const [wrap, setWrap] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const info = typeInfo(pendingBlob ?? cell.value)
  const shown = pendingBlob ?? cell.value

  const switchMode = (next: InspectorMode): void => {
    setMode(next)
    if (!dirty) setText(textForMode(shown, next))
    setError(null)
  }

  const apply = async (): Promise<void> => {
    let value: string | Uint8Array
    try {
      value = pendingBlob ?? valueFromEditor(text, mode, cell.value)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    if (await onApply(value)) {
      setDirty(false)
      setPendingBlob(null)
    }
  }

  const importFile = async (): Promise<void> => {
    try {
      const file = await api.files.openBinary({ title: `Import into ${cell.column}` })
      if (!file) return
      setPendingBlob(file.data)
      setDirty(true)
      setMode(autoMode(file.data))
      setText(textForMode(file.data, autoMode(file.data)))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const exportFile = async (): Promise<void> => {
    const data =
      shown instanceof Uint8Array ? new Uint8Array(shown) : new TextEncoder().encode(valueToText(shown))
    try {
      await api.files.saveBinary({ title: `Export ${cell.column}`, defaultName: `${cell.column}.bin`, data })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 p-3"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cell.editable) {
          e.preventDefault()
          void apply()
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" title={cell.column}>
            {cell.column}
          </span>
          <Badge variant={info.type === 'NULL' ? 'default' : 'signal'}>{info.type}</Badge>
        </div>
        <p className="text-micro text-muted-foreground tabular-nums">
          Row {cell.rowNumber.toLocaleString()}
          {info.detail && ` · ${info.detail}`}
        </p>
      </div>
      <Tabs value={mode} onValueChange={(v) => switchMode(v as InspectorMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="hex">Hex</TabsTrigger>
          <TabsTrigger value="image">Image</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-1">
        {mode === 'json' && (
          <TooltipIconButton
            label="Pretty-print JSON"
            onClick={() => {
              const err = jsonError(text)
              if (err) setError(err)
              else setText(JSON.stringify(JSON.parse(text), null, 2))
            }}
          >
            <BracesIcon />
          </TooltipIconButton>
        )}
        <TooltipIconButton label="Word wrap" aria-pressed={wrap} onClick={() => setWrap(!wrap)}>
          <WrapTextIcon />
        </TooltipIconButton>
        <TooltipIconButton
          label="Import from file"
          disabled={!cell.editable}
          onClick={() => void importFile()}
        >
          <UploadIcon />
        </TooltipIconButton>
        <TooltipIconButton
          label="Export to file"
          disabled={cell.value === null && !pendingBlob}
          onClick={() => void exportFile()}
        >
          <DownloadIcon />
        </TooltipIconButton>
        <TooltipIconButton
          label="Revert to the stored value"
          disabled={!dirty}
          onClick={() => {
            setPendingBlob(null)
            setDirty(false)
            setError(null)
            setText(textForMode(cell.value, mode))
          }}
        >
          <Undo2Icon />
        </TooltipIconButton>
      </div>
      {mode === 'image' ? (
        <ImagePreview value={shown} />
      ) : (
        <Textarea
          value={text}
          readOnly={!cell.editable || pendingBlob !== null}
          placeholder={cell.value === null ? 'NULL' : undefined}
          aria-label={`Value of ${cell.column}`}
          onChange={(e) => {
            setText(e.target.value)
            setDirty(true)
            setError(mode === 'json' ? jsonError(e.target.value) : null)
          }}
          className={cn(
            'field-sizing-fixed min-h-0 flex-1 resize-none font-mono',
            !wrap && 'overflow-x-auto whitespace-pre',
          )}
        />
      )}
      {error && (
        <p role="alert" className="text-micro text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="xs"
          disabled={!cell.editable || cell.value === null}
          onClick={() => void onApply(null)}
        >
          Set NULL
        </Button>
        <Button
          size="xs"
          disabled={!cell.editable || !dirty}
          onClick={() => void apply()}
          title={formatShortcut('Mod+Enter')}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
