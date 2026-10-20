import { useEffect, useMemo, useState } from 'react'
import { MAX_PAGE_ROWS } from '@shared/ipc/rows'
import type { SqlValue } from '@shared/types/values'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import type { PlotSource } from '@/store/plotSources'

/** Rows read at first; "Load all data" reads up to MAX_PLOT_ROWS. */
export const INITIAL_PLOT_ROWS = 1000
export const MAX_PLOT_ROWS = 200_000

export interface PlotRows {
  /** Column values only (no row key), in the source's column order. */
  rows: SqlValue[][]
  total: number
  loading: boolean
  error: string
}

interface Request {
  source: PlotSource
  limit: number
  /** Data version it was read at; a new one reads again. */
  version: number
}

async function readRows({ source, limit }: Request): Promise<{ rows: SqlValue[][]; total: number }> {
  if (source.kind === 'static') return { rows: source.rows.slice(0, limit), total: source.rows.length }
  const total =
    source.kind === 'browse' ? await api.rows.count(source.query) : await api.sql.count({ sql: source.sql })
  const rows: SqlValue[][] = []
  for (let offset = 0; offset < Math.min(total, limit); offset += MAX_PAGE_ROWS) {
    const count = Math.min(MAX_PAGE_ROWS, limit - offset)
    if (source.kind === 'browse') {
      const page = await api.rows.page({ query: source.query, offset, limit: count })
      rows.push(...page.map((r) => r.slice(1, 1 + source.columns.length)))
    } else {
      rows.push(...(await api.sql.page({ sql: source.sql, offset, limit: count })))
    }
  }
  return { rows, total }
}

const EMPTY: PlotRows = { rows: [], total: 0, loading: false, error: '' }

/** The first rows of `source` (all of them, up to a limit, with `all`); read again when data changes. */
export function usePlotRows(source: PlotSource | null, all: boolean): PlotRows {
  const dataVersion = useDbStore((s) => s.dataVersion)
  const request = useMemo<Request | null>(
    () => (source ? { source, limit: all ? MAX_PLOT_ROWS : INITIAL_PLOT_ROWS, version: dataVersion } : null),
    [source, all, dataVersion],
  )
  const [loaded, setLoaded] = useState<{ request: Request | null; result: PlotRows }>({
    request: null,
    result: EMPTY,
  })

  useEffect(() => {
    if (!request) return
    let live = true
    readRows(request).then(
      ({ rows, total }) => live && setLoaded({ request, result: { rows, total, loading: false, error: '' } }),
      (err: unknown) => live && setLoaded({ request, result: { ...EMPTY, error: errorMessage(err) } }),
    )
    return () => {
      live = false
    }
  }, [request])

  if (!request) return EMPTY
  // Until the new rows arrive, keep showing the last ones.
  return loaded.request === request ? loaded.result : { ...loaded.result, loading: true }
}
