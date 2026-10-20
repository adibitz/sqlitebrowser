import { describe, expect, it } from 'vitest'
import type { ChatItem, ToolCallView } from '@shared/types/chat'
import { describeTab } from '@/features/chat/chatContext'
import { applyChatEvent } from '@/features/chat/chatEvents'
import type { DocTab } from '@/store/tabs'

const start = { items: [] as ChatItem[], streamingId: null, busy: true, sessionId: 1 }
const view = (status: ToolCallView['status']): ToolCallView => ({
  id: 't1',
  name: 'run_query',
  input: {},
  status,
  summary: status,
})

describe('chat events', () => {
  it('joins streamed text, and starts a new reply after a tool call', () => {
    let s = applyChatEvent(start, { kind: 'text', sessionId: 1, delta: 'Hel' })
    s = applyChatEvent(s, { kind: 'text', sessionId: 1, delta: 'lo' })
    s = applyChatEvent(s, { kind: 'toolCall', sessionId: 1, call: view('running') })
    s = applyChatEvent(s, { kind: 'toolCall', sessionId: 1, call: view('done') })
    s = applyChatEvent(s, { kind: 'text', sessionId: 1, delta: 'Bye' })
    expect(
      s.items.map((i) => (i.kind === 'tool' ? i.call.status : i.kind === 'assistant' ? i.text : i.kind)),
    ).toEqual(['Hello', 'done', 'Bye'])
  })

  it('tracks approvals and ends with a note when stopped or failed', () => {
    let s = applyChatEvent(start, { kind: 'approval', sessionId: 1, approvalId: 'a', sql: 'DELETE FROM t' })
    s = applyChatEvent(s, { kind: 'approvalSettled', sessionId: 1, approvalId: 'a', approved: false })
    expect(s.items[0]).toMatchObject({ kind: 'approval', state: 'denied' })
    s = applyChatEvent(s, { kind: 'done', sessionId: 1, dataChanged: false, stopped: true })
    expect(s.busy).toBe(false)
    expect(s.items.at(-1)).toMatchObject({ kind: 'error', text: 'Stopped.' })
    expect(
      applyChatEvent(start, { kind: 'done', sessionId: 1, dataChanged: false, error: '401' }).items,
    ).toMatchObject([{ kind: 'error', text: '401' }])
  })
})

describe('chat context', () => {
  it('describes the active tab for the model', () => {
    const table = {
      id: 'table:main.customers',
      kind: 'table',
      object: { schema: 'main', name: 'customers' },
      view: 'data',
      browse: {
        filters: { country: '=IN' },
        globalFilter: 'a',
        sort: [{ column: 'name', direction: 'desc' }],
      },
    } as unknown as DocTab
    expect(describeTab(table)).toBe(
      'the data of table customers (country = IN; searching "a"; sorted by name desc)',
    )
    const sql = {
      id: 'sql:1',
      kind: 'sql',
      name: 'SQL 1',
      text: 'SELECT 1;',
      path: null,
      savedText: '',
    } as DocTab
    expect(describeTab(sql)).toBe('the SQL editor "SQL 1" containing:\nSELECT 1;')
    expect(describeTab(undefined)).toBeNull()
  })
})
