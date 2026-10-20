import { CheckIcon, KeyRoundIcon, LinkIcon } from 'lucide-react'
import type { IndexInfo, TableInfo, TriggerInfo } from '@shared/types/schema'
import { CardSection } from '@/components/CardSection'
import { EmptyNote } from '@/components/EmptyNote'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface StructureViewProps {
  table: TableInfo
  indices: IndexInfo[]
  triggers: TriggerInfo[]
}

const yes = <CheckIcon className="size-4" aria-label="Yes" />

/** Read-only overview of columns, keys, indices and triggers (port of table_tab.StructureView). */
export function StructureView({ table, indices, triggers }: StructureViewProps) {
  return (
    <div className="flex flex-col gap-6 overflow-auto p-4">
      <CardSection title="Columns">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">Key</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Not null</TableHead>
              <TableHead>Unique</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Check</TableHead>
              <TableHead>Collation</TableHead>
              <TableHead>References</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.columns.map((c) => (
              <TableRow key={c.name}>
                <TableCell>
                  {c.primaryKey ? (
                    <KeyRoundIcon
                      className="size-4 text-warning"
                      aria-label={table.autoIncrement ? 'Primary key (AUTOINCREMENT)' : 'Primary key'}
                    />
                  ) : c.foreignKey ? (
                    <LinkIcon className="size-4 text-muted-foreground" aria-label="Foreign key" />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{c.type}</TableCell>
                <TableCell>{c.notNull && yes}</TableCell>
                <TableCell>{c.unique && yes}</TableCell>
                <TableCell className="font-mono">{c.defaultValue}</TableCell>
                <TableCell className="font-mono">{c.check}</TableCell>
                <TableCell>{c.collation}</TableCell>
                <TableCell className="font-mono">
                  {c.foreignKey ?? (c.generated ? `GENERATED ${c.generated}` : '')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardSection>

      <CardSection title="Indices">
        {indices.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unique</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Where</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indices.map((i) => (
                <TableRow key={i.name}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.unique && yes}</TableCell>
                  <TableCell className="font-mono">{i.columns.join(', ') || '(automatic)'}</TableCell>
                  <TableCell className="font-mono">{i.where}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyNote>No indices on this table.</EmptyNote>
        )}
      </CardSection>

      <CardSection title="Triggers">
        {triggers.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Definition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triggers.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="max-w-0 truncate font-mono" title={t.sql}>
                    {t.sql.split(/\s+/).join(' ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyNote>No triggers on this table.</EmptyNote>
        )}
      </CardSection>
    </div>
  )
}
