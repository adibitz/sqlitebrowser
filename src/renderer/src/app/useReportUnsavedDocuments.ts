import { useEffect } from 'react'
import { api } from '@/lib/api'
import { isSqlModified, useTabsStore } from '@/store/tabs'

/** Tells main which SQL tabs have unsaved edits, so closing the window asks first. */
export function useReportUnsavedDocuments(): void {
  const names = useTabsStore((s) =>
    s.tabs
      .filter((t) => t.kind === 'sql' && isSqlModified(t))
      .map((t) => (t.kind === 'sql' ? t.name : ''))
      .join('\n'),
  )
  useEffect(() => {
    void api.app.setUnsavedDocuments({ names: names ? names.split('\n') : [] })
  }, [names])
}
