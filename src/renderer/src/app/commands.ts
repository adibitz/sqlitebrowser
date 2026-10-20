import { useMemo } from 'react'
import { findTable } from '@shared/types/schema'
import {
  ChartLineIcon,
  DatabaseZapIcon,
  FileCodeIcon,
  FileDownIcon,
  FileInputIcon,
  FileSpreadsheetIcon,
  FileUpIcon,
  FilePlus2Icon,
  FolderKanbanIcon,
  FolderOpenIcon,
  HardDriveIcon,
  InfoIcon,
  LinkIcon,
  ListOrderedIcon,
  LockIcon,
  Maximize2Icon,
  type LucideIcon,
  MoonIcon,
  PanelLeftIcon,
  PencilRulerIcon,
  RefreshCwIcon,
  SaveIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  TablePropertiesIcon,
  TerminalSquareIcon,
  Undo2Icon,
  XIcon,
} from 'lucide-react'
import {
  attachDatabase,
  closeDatabase,
  createDatabase,
  openDatabaseFromDialog,
  openMemoryDatabase,
  refreshSchema,
  revealDatabase,
  revertChanges,
  saveDatabaseAs,
  writeChanges,
} from '@/features/database/actions'
import { createIndex, editTable, openDatabaseInfo } from '@/features/database/schemaActions'
import { exportData, exportSql, importCsv, importSql } from '@/features/io/ioActions'
import { openProject, saveProject } from '@/features/project/projectActions'
import { closeTab, openSqlFile } from '@/features/sql/sqlFiles'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useSettingsStore } from '@/store/settings'
import { useTabsStore } from '@/store/tabs'
import { useUiStore } from '@/store/ui'

export interface Command {
  id: string
  title: string
  icon: LucideIcon
  /** e.g. "Mod+O"; see lib/shortcuts.ts */
  shortcut?: string
  enabled: boolean
  run: () => void
}

/** Switches to the opposite of what is showing now (System resolves to light or dark). */
function toggleTheme(): void {
  const isDark = document.documentElement.classList.contains('dark')
  void useSettingsStore.getState().update('General/theme', isDark ? 'light' : 'dark')
}

/** Every command of the app with its current enabled state (port of MainWindow._build_actions). */
export function useCommands(): Command[] {
  const isOpen = useDbStore((s) => s.state.isOpen)
  const dirty = useDbStore((s) => s.state.dirty)
  const isMemory = useDbStore((s) => s.state.path === ':memory:')
  const writable = useDbStore((s) => s.state.isOpen && !s.state.readOnly)
  const schemata = useDbStore((s) => s.state.schemata)
  const activeObject = useTabsStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeId)
    return tab?.kind === 'table' ? tab.object : null
  })
  /** The table (not view) in the active tab: what Modify table and Create index act on. */
  const activeTable =
    activeObject && findTable(schemata, activeObject)?.kind === 'table' ? activeObject : null

  return useMemo<Command[]>(
    () => [
      {
        id: 'db.new',
        title: 'New database',
        icon: FilePlus2Icon,
        shortcut: 'Mod+N',
        enabled: true,
        run: () => void createDatabase(),
      },
      {
        id: 'db.memory',
        title: 'New in-memory database',
        icon: DatabaseZapIcon,
        enabled: true,
        run: () => void openMemoryDatabase(),
      },
      {
        id: 'db.open',
        title: 'Open database',
        icon: FolderOpenIcon,
        shortcut: 'Mod+O',
        enabled: true,
        run: () => void openDatabaseFromDialog(),
      },
      {
        id: 'db.openReadOnly',
        title: 'Open database read-only',
        icon: LockIcon,
        shortcut: 'Mod+Shift+O',
        enabled: true,
        run: () => void openDatabaseFromDialog(true),
      },
      {
        id: 'db.write',
        title: 'Write changes',
        icon: SaveIcon,
        shortcut: 'Mod+S',
        enabled: isOpen && dirty,
        run: () => void writeChanges(),
      },
      {
        id: 'db.revert',
        title: 'Revert changes',
        icon: Undo2Icon,
        enabled: isOpen && dirty,
        run: () => void revertChanges(),
      },
      {
        id: 'db.saveAs',
        title: 'Save database as',
        icon: HardDriveIcon,
        shortcut: 'Mod+Alt+S',
        enabled: isOpen,
        run: () => void saveDatabaseAs(),
      },
      {
        id: 'db.attach',
        title: 'Attach database',
        icon: LinkIcon,
        enabled: isOpen,
        run: () => void attachDatabase(),
      },
      {
        id: 'db.reveal',
        title: 'Show database in folder',
        icon: FolderOpenIcon,
        enabled: isOpen && !isMemory,
        run: () => void revealDatabase(),
      },
      {
        id: 'db.refresh',
        title: 'Refresh schema',
        icon: RefreshCwIcon,
        enabled: isOpen,
        run: () => void refreshSchema(),
      },
      {
        id: 'db.close',
        title: 'Close database',
        icon: XIcon,
        shortcut: 'Mod+F4',
        enabled: isOpen,
        run: () => void closeDatabase(),
      },
      {
        id: 'schema.createTable',
        title: 'Create table',
        icon: TablePropertiesIcon,
        shortcut: 'Mod+Shift+T',
        enabled: writable,
        run: () => void editTable(null),
      },
      {
        id: 'schema.modifyTable',
        title: 'Modify table',
        icon: PencilRulerIcon,
        enabled: writable && activeTable !== null,
        run: () => void (activeTable && editTable(activeTable)),
      },
      {
        id: 'schema.createIndex',
        title: 'Create index',
        icon: ListOrderedIcon,
        enabled: writable,
        run: () => createIndex(activeTable),
      },
      {
        id: 'project.open',
        title: 'Open project',
        icon: FolderKanbanIcon,
        enabled: true,
        run: () => void openProject(),
      },
      {
        id: 'project.save',
        title: 'Save project',
        icon: FolderKanbanIcon,
        enabled: isOpen,
        run: () => void saveProject(),
      },
      {
        id: 'project.saveAs',
        title: 'Save project as',
        icon: FolderKanbanIcon,
        enabled: isOpen,
        run: () => void saveProject(true),
      },
      {
        id: 'io.importCsv',
        title: 'Import table from CSV',
        icon: FileSpreadsheetIcon,
        enabled: !isOpen || writable,
        run: () => void importCsv(),
      },
      {
        id: 'io.importSql',
        title: 'Import SQL file',
        icon: FileUpIcon,
        enabled: !isOpen || writable,
        run: () => void importSql(),
      },
      {
        id: 'io.exportData',
        title: 'Export data',
        icon: FileDownIcon,
        enabled: isOpen,
        run: () => exportData(null, activeObject),
      },
      {
        id: 'io.exportSql',
        title: 'Export database to SQL',
        icon: FileDownIcon,
        enabled: isOpen,
        run: exportSql,
      },
      {
        id: 'db.info',
        title: 'Database info and pragmas',
        icon: InfoIcon,
        shortcut: 'Mod+I',
        enabled: isOpen,
        run: openDatabaseInfo,
      },
      {
        id: 'sql.new',
        title: 'New SQL editor',
        icon: TerminalSquareIcon,
        shortcut: 'Mod+T',
        enabled: true,
        run: () => void useTabsStore.getState().openSql(),
      },
      {
        id: 'sql.open',
        title: 'Open SQL file',
        icon: FileInputIcon,
        enabled: true,
        run: () => void openSqlFile(),
      },
      {
        id: 'view.plot',
        title: 'Show or hide the plot',
        icon: ChartLineIcon,
        shortcut: 'Mod+Shift+P',
        enabled: isOpen,
        run: () => useUiStore.getState().togglePlot(),
      },
      {
        id: 'view.log',
        title: 'Show or hide the SQL log',
        icon: ScrollTextIcon,
        enabled: isOpen,
        run: () => useUiStore.getState().toggleLog(),
      },
      {
        id: 'view.schema',
        title: 'Database schema',
        icon: FileCodeIcon,
        shortcut: 'Mod+Shift+D',
        enabled: isOpen,
        run: () => useTabsStore.getState().openSchema(null),
      },
      {
        id: 'view.closeTab',
        title: 'Close tab',
        icon: XIcon,
        shortcut: 'Mod+W',
        enabled: isOpen,
        run: closeActiveTab,
      },
      {
        id: 'view.explorer',
        title: 'Show or hide Explorer',
        icon: PanelLeftIcon,
        shortcut: 'Mod+B',
        enabled: isOpen,
        run: () => useUiStore.getState().toggleExplorer(),
      },
      {
        id: 'view.fullScreen',
        title: 'Full screen table',
        icon: Maximize2Icon,
        shortcut: 'F11',
        enabled: isOpen,
        run: () => useUiStore.getState().setFullScreen(!useUiStore.getState().fullScreen),
      },
      {
        id: 'app.preferences',
        title: 'Preferences',
        icon: SettingsIcon,
        shortcut: 'Mod+,',
        enabled: true,
        run: () => useModalStore.getState().show({ kind: 'preferences' }),
      },
      {
        id: 'view.palette',
        title: 'Command palette',
        icon: SearchIcon,
        shortcut: 'Mod+K',
        enabled: true,
        run: () => useUiStore.getState().setPaletteOpen(true),
      },
      {
        id: 'view.theme',
        title: 'Toggle light/dark theme',
        icon: MoonIcon,
        shortcut: 'Mod+Shift+L',
        enabled: true,
        run: toggleTheme,
      },
    ],
    [isOpen, dirty, isMemory, writable, activeTable, activeObject],
  )
}

function closeActiveTab(): void {
  const { activeId } = useTabsStore.getState()
  if (activeId) void closeTab(activeId)
}

export function findCommand(commands: Command[], id: string): Command {
  const command = commands.find((c) => c.id === id)
  if (!command) throw new Error(`Unknown command ${id}`)
  return command
}
