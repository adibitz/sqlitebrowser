import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { BrowseQuery } from '@shared/types/rows'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { RowCache } from './rowCache'

/**
 * Rows of `query`, loaded lazily. A new cache (and a fresh count) whenever the query changes, the data
 * version is bumped (revert, executed SQL) or `reloadToken` changes (after add/delete).
 */
export function useRowSource(query: BrowseQuery, reloadToken: number): RowCache {
  const dataVersion = useDbStore((s) => s.dataVersion)
  const key = JSON.stringify(query)
  const cache = useMemo(
    () => {
      const q = JSON.parse(key) as BrowseQuery
      return new RowCache(
        () => api.rows.count(q),
        (offset, limit) => api.rows.page({ query: q, offset, limit }),
        errorMessage,
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dataVersion and reloadToken force a reload
    [key, dataVersion, reloadToken],
  )
  useEffect(() => {
    cache.start()
    return () => cache.dispose()
  }, [cache])
  useSyncExternalStore(cache.subscribe, cache.getVersion)
  return cache
}
