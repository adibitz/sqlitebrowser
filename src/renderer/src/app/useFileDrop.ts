import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { openDatabaseAt } from '@/features/database/actions'
import { importCsv, importSql } from '@/features/io/ioActions'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useDbStore } from '@/store/db'
import { useTabsStore } from '@/store/tabs'

const CSV_FILE = /\.(csv|tsv|txt)$/i

/** Port of MainWindow.dropEvent: CSV files are imported, SQL files opened, anything else as a database. */
async function openDropped(paths: string[]): Promise<void> {
  const csvs = paths.filter((p) => CSV_FILE.test(p))
  if (csvs.length) {
    await importCsv(csvs)
    return
  }
  const path = paths.find((p) => p.toLowerCase().endsWith('.sql'))
  if (!path) {
    if (paths[0]) await openDatabaseAt(paths[0])
    return
  }
  if (!useDbStore.getState().state.isOpen) {
    await importSql(path)
    return
  }
  try {
    const file = await api.files.openTextAt({ path })
    useTabsStore.getState().openSql({ text: file.content, path: file.path, name: file.name })
  } catch (err) {
    toast.error(`Couldn't read the file: ${errorMessage(err)}`)
  }
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/**
 * Dropping files anywhere in the window opens them: CSV files in the import, .sql in an editor (or
 * as an import when no database is open), anything else as a database.
 * Returns true while files are dragged over the window, for the drop overlay.
 */
export function useFileDrop(): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let depth = 0
    const onEnter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent): void => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length) void openDropped(files.map((f) => api.files.pathForFile(f)))
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return dragging
}
