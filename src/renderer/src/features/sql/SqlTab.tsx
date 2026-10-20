import { useEffect, useMemo, useRef } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { api } from '@/lib/api'
import { useDbStore } from '@/store/db'
import { usePlotSourcesStore } from '@/store/plotSources'
import { useSetting } from '@/store/settings'
import { useTabsStore, type SqlTab as SqlTabState } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { completionNamespace } from './editor/sqlCompletion'
import { SqlEditor, type EditorSettings, type SqlEditorHandle } from './editor/SqlEditor'
import { MessageList } from './MessageList'
import { ResultsPanel } from './ResultsPanel'
import { openSqlFile, saveSqlTab } from './sqlFiles'
import { SqlToolbar } from './SqlToolbar'
import { useSqlRun } from './useSqlRun'

/** SQL editor with results and messages (port of reference/sqliteview/ui/sql_tab.py). */
export function SqlTab({ tab }: { tab: SqlTabState }) {
  const editor = useRef<SqlEditorHandle>(null)
  const schemata = useDbStore((s) => s.state.schemata)
  const isOpen = useDbStore((s) => s.state.isOpen)
  const setSqlText = useTabsStore((s) => s.setSqlText)
  const fullScreen = useUiStore((s) => s.fullScreen)
  const { run, running, messages, result, runId } = useSqlRun(editor)
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  })
  // Command line --sql: run once shown; --quit writes the changes and exits afterwards.
  useEffect(() => {
    const mode = tab.autoRun
    if (!mode) return
    useTabsStore.getState().clearAutoRun(tab.id)
    setTimeout(() => {
      void (async () => {
        await runRef.current('all')
        if (mode !== 'runAndQuit') return
        await api.db.write()
        await api.app.quit()
      })()
    })
  }, [tab.autoRun, tab.id])
  const setPlotSource = usePlotSourcesStore((s) => s.set)
  useEffect(() => {
    if (!result) return
    const name = tab.name
    setPlotSource(
      tab.id,
      result.kind === 'query'
        ? { kind: 'sql', name, sql: result.sql, columns: result.columns }
        : { kind: 'static', name, columns: result.columns, rows: result.rows },
    )
    return () => setPlotSource(tab.id, null)
  }, [setPlotSource, tab.id, tab.name, result])

  const tabSize = useSetting('editor/tabsize') ?? 4
  const wrapLines = useSetting('editor/wrap_lines') ?? false
  const autoCompletion = useSetting('editor/auto_completion') ?? true
  const upperKeywords = useSetting('editor/upper_keywords') ?? true
  const fontSize = useSetting('editor/fontsize') ?? 10
  const settings = useMemo<EditorSettings>(
    () => ({ tabSize, wrapLines, autoCompletion, upperKeywords, fontSize }),
    [tabSize, wrapLines, autoCompletion, upperKeywords, fontSize],
  )
  const schema = useMemo(() => completionNamespace(schemata), [schemata])
  // Always save the latest text, not the text of the render that created the callback.
  const save = (): void => {
    const current = useTabsStore.getState().tabs.find((t) => t.id === tab.id)
    if (current?.kind === 'sql') void saveSqlTab(current)
  }

  const editorPane = (
    <SqlEditor
      ref={editor}
      initialText={tab.text}
      schema={schema}
      settings={settings}
      readOnly={running}
      onChange={(text) => setSqlText(tab.id, text)}
      onRun={(kind) => void run(kind)}
      onSave={save}
    />
  )
  const results = <ResultsPanel key={runId} source={result} />

  return (
    <div className="relative flex h-full flex-col">
      <SqlToolbar
        running={running}
        canRun={isOpen}
        onRun={(kind) => void run(kind)}
        onOpen={() => void openSqlFile()}
        onSave={save}
        onComment={() => editor.current?.toggleComment()}
        onFind={() => editor.current?.openFind()}
      />
      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        <ResizablePanel id="editor" defaultSize="40%" minSize={80}>
          {editorPane}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="results" defaultSize="45%" minSize={80}>
          {!fullScreen && results}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="messages" defaultSize="15%" minSize={48} className="bg-background">
          <MessageList messages={messages} />
        </ResizablePanel>
      </ResizablePanelGroup>
      {fullScreen && <div className="absolute inset-0 z-10 bg-card">{results}</div>}
    </div>
  )
}
