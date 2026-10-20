import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** "SQliteView 0.1.0 · SQLite 3.x". The SQLite version comes from the DB worker. */
export function AppVersion() {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([api.app.getInfo(), api.db.sqliteVersion()]).then(([info, sqlite]) => {
      if (!cancelled) setText(`SQliteView ${info.version} · SQLite ${sqlite}`)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="text-micro text-muted-foreground tabular-nums" data-testid="app-version">
      {text ?? ' '}
    </p>
  )
}
