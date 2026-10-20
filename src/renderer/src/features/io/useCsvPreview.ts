import { useEffect, useState } from 'react'
import type { CsvReadOptions } from '@shared/csv/csvOptions'
import type { CsvPreview } from '@shared/ipc/io'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'

const DELAY_MS = 150

/** The preview of `path` with `options`, read again shortly after either changes. */
export function useCsvPreview(
  path: string,
  options: CsvReadOptions,
): { preview: CsvPreview | null; error: string } {
  const [result, setResult] = useState<{ preview: CsvPreview | null; error: string }>({
    preview: null,
    error: '',
  })

  useEffect(() => {
    let live = true
    const timer = window.setTimeout(() => {
      api.io.previewCsv({ path, options }).then(
        (preview) => live && setResult({ preview, error: '' }),
        (err: unknown) =>
          live && setResult({ preview: null, error: `Couldn't read the file: ${errorMessage(err)}` }),
      )
    }, DELAY_MS)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [path, options])

  return result
}
