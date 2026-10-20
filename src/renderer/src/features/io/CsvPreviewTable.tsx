import type { CsvPreview } from '@shared/ipc/io'
import { humanReadableSize } from '@shared/format/data'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** The first rows of a CSV file as they would be imported. */
export function CsvPreviewTable({ preview, fileName }: { preview: CsvPreview; fileName: string }) {
  const { fields, rows } = preview
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-auto rounded-card border">
        <Table aria-label="CSV preview">
          <TableHeader>
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.name} className="whitespace-nowrap">
                  {f.name} <span className="font-normal text-muted-foreground">{f.type || 'any'}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, r) => (
              <TableRow key={r}>
                {fields.map((f, c) => (
                  <TableCell key={f.name} className="max-w-60 truncate whitespace-nowrap">
                    {row[c] ?? ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-label text-muted-foreground tabular-nums">
        {fileName} · {humanReadableSize(preview.fileSize)} · first {rows.length} rows · {fields.length}{' '}
        columns
      </p>
    </div>
  )
}
