import { CircleAlertIcon, DatabaseIcon } from 'lucide-react'
import { humanReadableSize } from '@shared/format/data'
import type { RecentFile } from '@shared/types/files'
import { openDatabaseAt } from '@/features/database/actions'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function meta(file: RecentFile): string {
  if (!file.exists) return `${file.folder} · missing`
  const parts = [file.folder]
  if (file.size !== null) parts.push(humanReadableSize(file.size))
  if (file.modified !== null) parts.push(dateFormat.format(file.modified))
  return parts.join(' · ')
}

/** Recently opened databases; missing files are listed but can't be opened. */
export function RecentList({ files }: { files: RecentFile[] }) {
  if (!files.length) {
    return (
      <p className="text-muted-foreground">
        No recent databases. Drop a database file anywhere in this window to open it.
      </p>
    )
  }
  return (
    <ul className="flex flex-col" aria-label="Recent databases">
      {files.map((file) => (
        <li key={file.path}>
          <button
            type="button"
            disabled={!file.exists}
            title={file.path}
            onClick={() => void openDatabaseAt(file.path, file.readOnly)}
            className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-[background-color] duration-200 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {file.exists ? (
              <DatabaseIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <CircleAlertIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{file.name}</span>
              <span className="truncate text-micro text-muted-foreground tabular-nums">{meta(file)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
