import { CreateIndexDialog } from '@/features/createIndex/CreateIndexDialog'
import { EditTableDialog } from '@/features/editTable/EditTableDialog'
import { ExportDataDialog } from '@/features/io/ExportDataDialog'
import { ExportSqlDialog } from '@/features/io/ExportSqlDialog'
import { ImportCsvDialog } from '@/features/io/ImportCsvDialog'
import { PreferencesDialog } from '@/features/preferences/PreferencesDialog'
import { InsertRecordDialog } from '@/features/table/data/InsertRecordDialog'
import { CondFormatDialog } from '@/features/table/formats/CondFormatDialog'
import { DisplayFormatDialog } from '@/features/table/formats/DisplayFormatDialog'
import { useModalStore } from '@/store/modals'

/** Renders the open feature dialog (store/modals). Mounted once in the shell. */
export function ModalHost() {
  const open = useModalStore((s) => s.open)
  if (!open) return null
  switch (open.kind) {
    case 'editTable':
      return <EditTableDialog original={open.ref} commitConfirmed={open.commitConfirmed} />
    case 'createIndex':
      return <CreateIndexDialog table={open.table} />
    case 'insertRecord':
      return <InsertRecordDialog table={open.ref} />
    case 'importCsv':
      return <ImportCsvDialog paths={open.paths} />
    case 'exportData':
      return <ExportDataDialog source={open.source} selected={open.selected} />
    case 'exportSql':
      return <ExportSqlDialog />
    case 'displayFormat':
      return <DisplayFormatDialog tabId={open.tabId} table={open.table} column={open.column} />
    case 'condFormats':
      return <CondFormatDialog tabId={open.tabId} column={open.column} />
    case 'preferences':
      return <PreferencesDialog />
  }
}
