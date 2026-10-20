import { useEffect, useMemo, useState } from 'react'
import { imageFormat } from '@shared/format/data'
import type { SqlValue } from '@shared/types/values'

const MIME: Record<string, string> = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  BMP: 'image/bmp',
  WEBP: 'image/webp',
  ICO: 'image/x-icon',
  SVG: 'image/svg+xml',
  TIFF: 'image/tiff',
}

/** Shows a BLOB as an image; tiny images are scaled up without smoothing so they stay crisp. */
export function ImagePreview({ value }: { value: SqlValue }) {
  const format = value instanceof Uint8Array ? imageFormat(value) : ''
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const url = useMemo(
    () =>
      value instanceof Uint8Array && format
        ? URL.createObjectURL(new Blob([value as Uint8Array<ArrayBuffer>], { type: MIME[format] }))
        : null,
    [value, format],
  )
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  if (!format || !url) return <p className="flex-1 text-muted-foreground">Not an image.</p>
  const small = size && Math.max(size.w, size.h) < 128
  return (
    <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto rounded-card bg-surface-2 p-3">
      <img
        src={url}
        alt="Cell value as an image"
        onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        className="max-h-full max-w-full object-contain"
        style={small ? { width: 128, height: 128, imageRendering: 'pixelated' } : undefined}
      />
      {size && (
        <figcaption className="text-micro text-muted-foreground tabular-nums">
          {size.w} × {size.h} px · {format}
        </figcaption>
      )}
    </figure>
  )
}
