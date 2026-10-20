import { useMemo, useState } from 'react'
import { ClipboardCopyIcon, FileCodeIcon } from 'lucide-react'
import { objectDisplayName, type ObjectRef } from '@shared/types/schema'
import { SqlBlock } from '@/components/SqlBlock'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { copyText } from '@/lib/clipboard'
import { useDbStore } from '@/store/db'
import { schemaSql } from './schemaSql'

const WHOLE_DATABASE = '*'

/** The CREATE statements of the database or of one table (port of schema_tab.SchemaTab). */
export function SchemaTab({ initialScope }: { initialScope: ObjectRef | null }) {
  const schemata = useDbStore((s) => s.state.schemata)
  const [scopeKey, setScopeKey] = useState(initialScope ? JSON.stringify(initialScope) : WHOLE_DATABASE)
  const [related, setRelated] = useState(true)

  const scopes = useMemo(() => {
    const items = [{ value: WHOLE_DATABASE, label: 'Whole database' }]
    for (const s of schemata) {
      for (const t of s.tables) {
        if (t.kind === 'system' || !t.sql) continue
        const ref = { schema: s.name, name: t.name }
        items.push({ value: JSON.stringify(ref), label: objectDisplayName(ref) })
      }
    }
    return items
  }, [schemata])

  const scope: ObjectRef | null = scopeKey === WHOLE_DATABASE ? null : (JSON.parse(scopeKey) as ObjectRef)
  const sql = useMemo(() => schemaSql(schemata, scope, related), [schemata, scope, related])

  return (
    <section className="flex h-full flex-col" aria-label="Schema">
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2">
        <FileCodeIcon className="size-4 text-muted-foreground" />
        <h2 className="font-medium">Schema</h2>
        <Select items={scopes} value={scopeKey} onValueChange={(v) => setScopeKey(String(v))}>
          <SelectTrigger size="sm" className="min-w-52" aria-label="Show schema of">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scopes.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="gap-2 font-normal">
          <Checkbox checked={related} onCheckedChange={(c) => setRelated(c === true)} />
          Indices and triggers
        </Label>
        <div className="ml-auto">
          <TooltipIconButton
            label="Copy schema SQL"
            disabled={!sql}
            onClick={() => void copyText(sql, 'the schema')}
          >
            <ClipboardCopyIcon />
          </TooltipIconButton>
        </div>
      </div>
      <SqlBlock sql={sql} className="min-h-0 flex-1" empty="This database has no tables yet." />
    </section>
  )
}
