import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment } from '@codemirror/commands'
import { sql, SQLite, type SQLNamespace } from '@codemirror/lang-sql'
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language'
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { editorTheme } from './editorTheme'
import { marksField, setMarks, type RangeMark } from './marks'

export type RunKind = 'all' | 'current' | 'line'

export interface EditorSettings {
  tabSize: number
  wrapLines: boolean
  autoCompletion: boolean
  upperKeywords: boolean
  /** points (Python setting); 0 = default */
  fontSize: number
}

export interface SqlEditorHandle {
  getText(): string
  /** Selected range, or null when nothing is selected. */
  getSelection(): { from: number; to: number } | null
  getCursor(): number
  /** Start and end of the line the cursor is on. */
  getLineRange(): { from: number; to: number }
  setMarks(marks: RangeMark[]): void
  toggleComment(): void
  openFind(): void
  focus(): void
}

interface SqlEditorProps {
  ref?: Ref<SqlEditorHandle>
  initialText: string
  schema: SQLNamespace
  settings: EditorSettings
  readOnly: boolean
  onChange: (text: string) => void
  onRun: (kind: RunKind) => void
  onSave: () => void
}

function languageFor(schema: SQLNamespace, settings: EditorSettings) {
  return sql({ dialect: SQLite, schema, defaultSchema: 'main', upperCaseKeywords: settings.upperKeywords })
}

/** CodeMirror 6 SQL editor (port of reference/sqliteview/ui/sql_editor.py). */
export function SqlEditor({
  ref,
  initialText,
  schema,
  settings,
  readOnly,
  onChange,
  onRun,
  onSave,
}: SqlEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const callbacks = useRef({ onChange, onRun, onSave })
  const compartments = useRef({
    language: new Compartment(),
    wrap: new Compartment(),
    readOnly: new Compartment(),
    completion: new Compartment(),
    tabSize: new Compartment(),
  })

  useEffect(() => {
    callbacks.current = { onChange, onRun, onSave }
  })

  // Create once; later prop changes are applied through compartments below.
  useEffect(() => {
    const c = compartments.current
    const runKeys = Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: () => (callbacks.current.onRun('all'), true) },
        { key: 'F5', run: () => (callbacks.current.onRun('all'), true) },
        { key: 'Mod-r', run: () => (callbacks.current.onRun('all'), true) },
        { key: 'Shift-F5', run: () => (callbacks.current.onRun('current'), true) },
        { key: 'Shift-F6', run: () => (callbacks.current.onRun('line'), true) },
        { key: 'Mod-Shift-s', run: () => (callbacks.current.onSave(), true) },
        { key: 'Mod-/', run: toggleComment },
      ]),
    )
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          runKeys,
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightSelectionMatches(),
          placeholder('Write SQL here. Ctrl+Enter runs everything, or the selection.'),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          marksField,
          editorTheme,
          c.language.of(languageFor(schema, settings)),
          c.completion.of(autocompletion({ activateOnTyping: settings.autoCompletion })),
          c.wrap.of(settings.wrapLines ? EditorView.lineWrapping : []),
          c.tabSize.of([
            EditorState.tabSize.of(settings.tabSize),
            indentUnit.of(' '.repeat(settings.tabSize)),
          ]),
          c.readOnly.of(EditorState.readOnly.of(readOnly)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString())
          }),
          EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' }),
        ],
      }),
    })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the editor is created once
  }, [])

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.language.reconfigure(languageFor(schema, settings)),
    })
  }, [schema, settings])

  useEffect(() => {
    const c = compartments.current
    view.current?.dispatch({
      effects: [
        c.wrap.reconfigure(settings.wrapLines ? EditorView.lineWrapping : []),
        c.completion.reconfigure(autocompletion({ activateOnTyping: settings.autoCompletion })),
        c.tabSize.reconfigure([
          EditorState.tabSize.of(settings.tabSize),
          indentUnit.of(' '.repeat(settings.tabSize)),
        ]),
      ],
    })
  }, [settings])

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.readOnly.reconfigure(EditorState.readOnly.of(readOnly)),
    })
  }, [readOnly])

  useImperativeHandle(ref, () => ({
    getText: () => view.current?.state.doc.toString() ?? '',
    getSelection: () => {
      const sel = view.current?.state.selection.main
      return sel && !sel.empty ? { from: sel.from, to: sel.to } : null
    },
    getCursor: () => view.current?.state.selection.main.head ?? 0,
    getLineRange: () => {
      const state = view.current?.state
      if (!state) return { from: 0, to: 0 }
      const line = state.doc.lineAt(state.selection.main.head)
      return { from: line.from, to: line.to }
    },
    setMarks: (marks) => view.current?.dispatch({ effects: setMarks.of(marks) }),
    toggleComment: () => {
      if (view.current) toggleComment(view.current)
    },
    openFind: () => {
      if (view.current) openSearchPanel(view.current)
    },
    focus: () => view.current?.focus(),
  }))

  return (
    <div
      ref={host}
      className="h-full min-h-0 overflow-hidden"
      style={settings.fontSize > 0 ? { fontSize: `${settings.fontSize}pt` } : { fontSize: '0.875rem' }}
    />
  )
}
