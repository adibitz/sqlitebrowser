// The chat loop with a scripted model, the real MCP tools and a real database (no network).
import { describe, expect, it } from 'vitest'
import type { ChatEvent } from '@shared/types/chat'
import { createApprovals } from '../../../../src/main/ai/chat/approvals'
import { toChatItems } from '../../../../src/main/ai/chat/items'
import { runChat, type ChatRunDeps } from '../../../../src/main/ai/chat/loop'
import { withToolResults, type ChatMessage } from '../../../../src/main/ai/chat/messages'
import type { AiDatabase } from '../../../../src/main/ai/mcp/tools/index'
import type { ChatProvider, ChatReply, ChatRequest } from '../../../../src/main/ai/providers/provider'
import { describeTable, listTables, runQuery, runSql, sampleRows } from '../../../../src/main/core/aiTools'
import { querySingleValue } from '../../../../src/main/core/db/execute'
import { isDirty, type DbSession } from '../../../../src/main/core/db/session'
import { createChatHistoryStore } from '../../../../src/main/prefs/chatHistory'
import { openPrefsDb } from '../../../../src/main/prefs/database'
import { openCoreTestDb } from '../../../fixtures/coreTestDb'

function sessionDatabase(db: DbSession): AiDatabase {
  return {
    listTables: async () => listTables(db),
    describeTable: async (ref) => describeTable(db, ref),
    sampleRows: async (ref, limit) => sampleRows(db, ref, limit),
    runQuery: async (sql) => runQuery(db, sql),
    runSql: async (sql) => runSql(db, sql),
  }
}

/** A model that answers with the given replies in turn and records what it was sent. */
function scriptedProvider(replies: ChatReply[]): ChatProvider & { requests: ChatRequest[] } {
  const requests: ChatRequest[] = []
  return {
    requests,
    async reply(req, onText) {
      requests.push({ ...req, messages: [...req.messages] })
      const next = replies.shift() ?? { text: 'done', toolCalls: [] }
      if (next.text) onText(next.text)
      return next
    },
    listModels: async () => [],
  }
}

function setup(replies: ChatReply[], answer: (sql: string) => boolean | 'stop' = () => true) {
  const db = openCoreTestDb()
  const history = createChatHistoryStore(openPrefsDb(':memory:'))
  const sessionId = history.createSession('demo.db', null, 'test-model')
  const events: ChatEvent[] = []
  const abort = new AbortController()
  const approvals = createApprovals(() => {})
  const provider = scriptedProvider(replies)
  const deps: ChatRunDeps = {
    provider,
    model: 'test-model',
    db: sessionDatabase(db),
    facts: { name: 'demo.db', readOnly: false },
    history,
    approvals,
    emit: (event) => {
      events.push(event)
      if (event.kind === 'approval') {
        const decision = answer('')
        if (decision === 'stop') abort.abort()
        else approvals.settle(event.approvalId, decision)
      }
    },
  }
  const run = (text: string) =>
    runChat(deps, sessionId, text, { activeTab: 'table main.parent' }, abort.signal)
  return { db, history, sessionId, events, provider, run }
}

const call = (id: string, name: string, input: Record<string, unknown> = {}) => ({ id, name, input })

describe('chat loop', () => {
  it('lets the model read through the tools, then answer', async () => {
    const t = setup([
      {
        text: '',
        toolCalls: [
          call('c1', 'list_tables'),
          call('c2', 'run_query', { sql: 'SELECT count(*) AS n FROM parent' }),
        ],
      },
      { text: 'There are 3 parents.', toolCalls: [] },
    ])
    await t.run('How many parents?')
    const tools = t.events.flatMap((e) =>
      e.kind === 'toolCall' && e.call.status !== 'running' ? [e.call] : [],
    )
    expect(tools.map((c) => c.summary)).toEqual(['Listed 4 tables', 'Ran a query · 1 row'])
    expect(tools[1]!.table).toEqual({ columns: ['n'], rows: [[3]], total: 1 })
    expect(t.events.at(-1)).toEqual({ kind: 'done', sessionId: t.sessionId, dataChanged: false })
    // The second request carries the tool results and the context of the open tab.
    const second = t.provider.requests[1]!
    expect(second.messages.at(-1)).toMatchObject({
      role: 'tool',
      results: [{ callId: 'c1' }, { callId: 'c2' }],
    })
    expect(second.system).toContain('The user is looking at: table main.parent.')
    expect(second.tools.map((s) => s.name)).toEqual([
      'list_tables',
      'describe_table',
      'sample_rows',
      'run_query',
      'run_sql',
    ])
    expect(toChatItems(t.history.messages(t.sessionId)).map((i) => i.kind)).toEqual([
      'user',
      'tool',
      'tool',
      'assistant',
    ])
  })

  it('refuses writes in run_query', async () => {
    const t = setup([{ text: '', toolCalls: [call('c1', 'run_query', { sql: 'DELETE FROM parent' })] }])
    await t.run('Clean up')
    const done = t.events.find((e) => e.kind === 'toolCall' && e.call.status === 'error')
    expect(done).toMatchObject({ call: { error: expect.stringContaining('only runs statements that read') } })
    expect(querySingleValue(t.db, 'SELECT count(*) FROM parent')).toBe(3n)
  })

  it('runs a write only after approval, as a pending change', async () => {
    const t = setup([
      { text: '', toolCalls: [call('c1', 'run_sql', { sql: "INSERT INTO parent(name) VALUES ('dora')" })] },
      { text: 'Added.', toolCalls: [] },
    ])
    await t.run('Add dora')
    expect(t.events.some((e) => e.kind === 'approval')).toBe(true)
    expect(querySingleValue(t.db, "SELECT count(*) FROM parent WHERE name = 'dora'")).toBe(1n)
    expect(isDirty(t.db)).toBe(true)
    expect(t.events.at(-1)).toMatchObject({ kind: 'done', dataChanged: true })
  })

  it('tells the model when a write was denied', async () => {
    const t = setup(
      [
        { text: '', toolCalls: [call('c1', 'run_sql', { sql: 'DELETE FROM parent' })] },
        { text: 'Okay, nothing changed.', toolCalls: [] },
      ],
      () => false,
    )
    await t.run('Delete everything')
    expect(querySingleValue(t.db, 'SELECT count(*) FROM parent')).toBe(3n)
    expect(t.provider.requests[1]!.messages.at(-1)).toMatchObject({
      role: 'tool',
      results: [{ isError: true, content: expect.stringContaining('did not approve') }],
    })
  })

  it('stops while waiting for approval and leaves a conversation that can go on', async () => {
    const t = setup(
      [{ text: '', toolCalls: [call('c1', 'run_sql', { sql: 'DELETE FROM parent' })] }],
      () => 'stop',
    )
    await t.run('Delete everything')
    expect(t.events.at(-1)).toMatchObject({ kind: 'done', stopped: true })
    expect(querySingleValue(t.db, 'SELECT count(*) FROM parent')).toBe(3n)
    const stored = t.history.messages(t.sessionId)
    expect(stored.at(-1)).toMatchObject({ role: 'tool', results: [{ isError: true }] })
  })

  it('reports provider errors', async () => {
    const t = setup([])
    t.provider.reply = async () => {
      throw new Error('401 invalid x-api-key')
    }
    await t.run('Hello')
    expect(t.events.at(-1)).toMatchObject({ kind: 'done', error: '401 invalid x-api-key' })
  })
})

describe('chat history', () => {
  it('adds results for tool calls a stopped chat left open', () => {
    const messages: ChatMessage[] = [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: '', toolCalls: [call('a', 'list_tables'), call('b', 'list_tables')] },
      { role: 'tool', results: [{ callId: 'a', content: '[]', isError: false }] },
      { role: 'assistant', text: '', toolCalls: [call('c', 'list_tables')] },
    ]
    const fixed = withToolResults(messages)
    expect(fixed[2]).toMatchObject({
      role: 'tool',
      results: [{ callId: 'a' }, { callId: 'b', isError: true }],
    })
    expect(fixed[4]).toMatchObject({ role: 'tool', results: [{ callId: 'c', isError: true }] })
  })

  it('keeps one conversation per database file', () => {
    const history = createChatHistoryStore(openPrefsDb(':memory:'))
    expect(history.latestSession('a.db')).toBeNull()
    const id = history.createSession('a.db', null, 'm')
    history.add(id, { role: 'user', text: 'hello' })
    expect(history.latestSession('a.db')).toBe(id)
    expect(history.messages(id)).toEqual([{ role: 'user', text: 'hello' }])
    history.clear('a.db')
    expect(history.latestSession('a.db')).toBeNull()
  })
})

describe('approvals', () => {
  it('times out as denied', async () => {
    const settled: boolean[] = []
    const approvals = createApprovals((_id, approved) => settled.push(approved), 5)
    expect(await approvals.request('DELETE FROM t', new AbortController().signal, () => {})).toBe(false)
    expect(settled).toEqual([false])
  })
})
