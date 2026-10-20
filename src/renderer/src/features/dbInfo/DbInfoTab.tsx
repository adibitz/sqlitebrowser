import { useEffect, useMemo, useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { DatabaseInfo } from '@shared/ipc/schema'
import { changedPragmas, normalizePragmaValue, PRAGMAS, type PragmaValue } from '@shared/schema/pragmas'
import { MEMORY_DATABASE } from '@shared/types/db'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { confirm } from '@/store/dialogs'
import { infoStats, pragmaLabel } from './infoStats'
import { PragmaField } from './PragmaField'

/** Database overview and pragma editor (port of ui/db_info_tab.py). */
export function DbInfoTab() {
  const state = useDbStore((s) => s.state)
  const sqliteVersion = useDbStore((s) => s.sqliteVersion)
  const dataVersion = useDbStore((s) => s.dataVersion)
  const [info, setInfo] = useState<DatabaseInfo | null>(null)
  /** Pragmas changed in the form and not saved yet. */
  const [edits, setEdits] = useState<Record<string, PragmaValue>>({})
  const [saving, setSaving] = useState(false)
  /** Bumped to read the info again (after saving pragmas). */
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let live = true
    api.schema.info().then(
      (next) => live && setInfo(next),
      (err: unknown) => toast.error(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [dataVersion, state.path, reloads])

  const loaded = useMemo(
    () => Object.fromEntries(PRAGMAS.map((d) => [d.name, normalizePragmaValue(d, info?.pragmas[d.name])])),
    [info],
  )
  const values = { ...loaded, ...edits }
  const changes = changedPragmas(loaded, values)
  const changeCount = Object.keys(changes).length

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      const first = await api.schema.setPragmas({ values: changes, commitConfirmed: false })
      if (first.kind === 'needsCommit') {
        const choice = await confirm({
          title: 'Write pending changes?',
          description: 'Setting pragmas writes all pending changes to the file first.',
          actions: [{ id: 'write', label: 'Write and set pragmas' }],
        })
        if (choice !== 'write') return
        await api.schema.setPragmas({ values: changes, commitConfirmed: true })
      }
      setEdits({})
      toast.success(`${changeCount} pragma${changeCount === 1 ? '' : 's'} updated`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
      setReloads((n) => n + 1)
    }
  }

  const readOnly = state.readOnly

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-title font-medium">Database info</h2>
          <p className="truncate text-body-sm text-muted-foreground select-text" title={state.path}>
            {state.path === MEMORY_DATABASE ? 'In-memory database' : state.path}
          </p>
        </header>
        {info && (
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {infoStats(info, state, sqliteVersion).map((s) => (
              <div key={s.title} className="flex flex-col gap-1 rounded-card bg-card p-4 shadow-subtle">
                <dt className="text-micro font-medium text-muted-foreground uppercase">{s.title}</dt>
                <dd className="text-body font-medium tabular-nums select-text">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <section
          aria-labelledby="pragmas-title"
          className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-subtle"
        >
          <div className="flex items-center gap-2">
            <h3 id="pragmas-title" className="text-body font-medium">
              Pragmas
            </h3>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!changeCount || saving}
                onClick={() => setEdits({})}
              >
                Reset
              </Button>
              <Button size="sm" disabled={!changeCount || saving || readOnly} onClick={() => void save()}>
                <CheckIcon /> Save pragmas
              </Button>
            </div>
          </div>
          <p className="text-label text-muted-foreground">
            Changing pragmas writes pending changes first. Some settings only last for this connection.
          </p>
          <div className="grid grid-cols-[minmax(10rem,auto)_auto_1fr] items-center gap-x-4 gap-y-2">
            {PRAGMAS.map((def) => {
              const label = pragmaLabel(def.name)
              return (
                <div key={def.name} className="contents">
                  <span className="text-body-sm font-medium">{label}</span>
                  <PragmaField
                    def={def}
                    label={label}
                    value={values[def.name] ?? ''}
                    disabled={!info || readOnly}
                    onChange={(value) => setEdits({ ...edits, [def.name]: value })}
                  />
                  <span className="text-label text-muted-foreground">{def.description}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
