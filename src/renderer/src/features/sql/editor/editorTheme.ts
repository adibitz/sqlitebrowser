import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

const MONO = "ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace"

/** Editor chrome from the design tokens, so it follows light and dark like everything else. */
const chrome = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--card)', color: 'var(--foreground)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: MONO, lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--foreground)', padding: '8px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    color: 'var(--muted-foreground)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--surface-2) 45%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--surface-2)', color: 'var(--foreground)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--signal-tint)',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--surface-3)', outline: 'none' },
  '.cm-searchMatch': { backgroundColor: 'var(--warning-tint)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--signal-tint)' },
  '.cm-sql-executed': { backgroundColor: 'color-mix(in oklab, var(--success-tint) 70%, transparent)' },
  '.cm-sql-error': {
    textDecoration: 'underline wavy var(--destructive)',
    textUnderlineOffset: '3px',
  },
  '.cm-sql-error-line': { backgroundColor: 'color-mix(in oklab, var(--destructive-tint) 70%, transparent)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: 'var(--elevation-float)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul': { fontFamily: MONO, maxHeight: '16rem' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '2px 8px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--foreground)',
  },
  '.cm-completionDetail': { color: 'var(--muted-foreground)', fontStyle: 'normal' },
  '.cm-panels': { backgroundColor: 'var(--background)', color: 'var(--foreground)' },
  '.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '6px 8px', fontFamily: 'inherit' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': { fontFamily: 'inherit', fontSize: '0.8125rem' },
  '.cm-textfield': {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--input)',
    borderRadius: '10px',
    padding: '2px 8px',
    color: 'var(--foreground)',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--surface-2)',
    border: 'none',
    borderRadius: '9999px',
    padding: '2px 10px',
    color: 'var(--foreground)',
  },
})

// Monochrome first: keywords carry weight, literals a quiet semantic tint, comments recede.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: 'var(--success-ink)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--warning-ink)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: [t.typeName, t.standard(t.name)], color: 'var(--signal-ink)' },
  { tag: [t.operator, t.punctuation, t.paren, t.bracket], color: 'var(--muted-foreground)' },
  { tag: [t.special(t.name), t.quote], color: 'var(--foreground)' },
])

export const editorTheme: Extension = [chrome, syntaxHighlighting(highlight)]
