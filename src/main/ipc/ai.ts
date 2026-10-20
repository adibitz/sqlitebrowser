import { basename } from 'node:path'
import type { BrowserWindow } from 'electron'
import { aiChannels, aiEvents, aiSchemas } from '@shared/ipc/ai'
import { MEMORY_DATABASE } from '@shared/types/db'
import type { ChatEvent } from '@shared/types/chat'
import { createApprovals } from '../ai/chat/approvals'
import { toChatItems } from '../ai/chat/items'
import { withToolResults } from '../ai/chat/messages'
import { runChat } from '../ai/chat/loop'
import type { AiDatabase } from '../ai/mcp/tools/index'
import { createProvider } from '../ai/providers/createProvider'
import { UserError } from '../errors'
import type { ChatHistoryStore } from '../prefs/chatHistory'
import type { ProviderStore, SecretBox } from '../prefs/providers'
import type { SettingsStore } from '../prefs/settings'
import type { DbWorker } from '../worker/rpc'
import type { DbStateTracker } from './db'
import { handle } from './handle'

export interface AiIpcDeps {
  providers: ProviderStore
  secrets: SecretBox
  history: ChatHistoryStore
  settings: SettingsStore
  worker: DbWorker
  dbState: DbStateTracker
  getWindow: () => BrowserWindow | null
}

/** The database side of the MCP tools: calls into the DB worker. */
function workerDatabase(worker: DbWorker): AiDatabase {
  return {
    listTables: () => worker.call('ai.listTables'),
    describeTable: (ref) => worker.call('ai.describeTable', ref),
    sampleRows: (ref, limit) => worker.call('ai.sampleRows', { table: ref, limit }),
    runQuery: (sql) => worker.call('ai.runQuery', { sql }),
    runSql: (sql) => worker.call('ai.runSql', { sql }),
  }
}

export function registerAiIpc(deps: AiIpcDeps): void {
  const { providers, secrets, history, settings, worker, dbState, getWindow } = deps
  const emit = (event: ChatEvent): void => getWindow()?.webContents.send(aiEvents.chat, event)
  const approvals = createApprovals((approvalId, approved) => {
    const sessionId = approvalSessions.get(approvalId)
    approvalSessions.delete(approvalId)
    if (sessionId !== undefined) emit({ kind: 'approvalSettled', sessionId, approvalId, approved })
  })
  const approvalSessions = new Map<string, number>()
  const running = new Map<number, AbortController>()
  const database = workerDatabase(worker)

  /** The conversation of the open database: the latest one for a file, this run's for in-memory. */
  let current: { path: string; sessionId: number | null } = { path: '', sessionId: null }
  const conversation = (): { path: string; sessionId: number | null } => {
    const { path, isOpen } = dbState.get()
    if (!isOpen) throw new UserError('Open a database to chat about it.')
    if (current.path !== path) {
      current = { path, sessionId: path === MEMORY_DATABASE ? null : history.latestSession(path) }
    }
    return current
  }

  handle(aiChannels.listProviders, aiSchemas.listProviders, () => providers.list())
  handle(aiChannels.saveProvider, aiSchemas.saveProvider, (req) => providers.insert(req))
  handle(aiChannels.deleteProvider, aiSchemas.deleteProvider, ({ id }) => {
    providers.remove(id)
    if (settings.get('ai/activeProviderId') === id) settings.set('ai/activeProviderId', null)
  })
  handle(aiChannels.canEncryptKeys, aiSchemas.canEncryptKeys, () => secrets.canEncrypt())

  handle(aiChannels.listModels, aiSchemas.listModels, async ({ providerId }) => {
    const provider = providers.get(providerId)
    if (!provider) throw new UserError('That provider no longer exists.')
    try {
      return await createProvider(provider, providers.getApiKey(providerId)).listModels()
    } catch (err) {
      throw new UserError(`Couldn't list the models: ${(err as Error).message}`, { cause: err })
    }
  })

  handle(aiChannels.send, aiSchemas.send, ({ text, context, providerId, model }) => {
    if (!settings.get('ai/enabled')) throw new UserError('The AI assistant is turned off in Preferences.')
    const provider = providers.get(providerId)
    if (!provider) throw new UserError('Choose an AI provider first.')
    const chat = conversation()
    if (chat.sessionId !== null && running.has(chat.sessionId)) {
      throw new UserError('Wait for the current reply, or stop it.')
    }
    const sessionId =
      chat.sessionId ??
      history.createSession(chat.path === MEMORY_DATABASE ? null : chat.path, providerId, model)
    chat.sessionId = sessionId
    const abort = new AbortController()
    running.set(sessionId, abort)
    const { path, readOnly } = dbState.get()
    void runChat(
      {
        provider: createProvider(provider, providers.getApiKey(providerId)),
        model,
        db: database,
        facts: { name: path === MEMORY_DATABASE ? 'an in-memory database' : basename(path), readOnly },
        history,
        approvals: {
          request: (sql, signal, announce) =>
            approvals.request(sql, signal, (approvalId) => {
              approvalSessions.set(approvalId, sessionId)
              announce(approvalId)
            }),
          settle: approvals.settle,
        },
        emit,
      },
      sessionId,
      text,
      context,
      abort.signal,
    ).finally(() => running.delete(sessionId))
    return { sessionId }
  })

  handle(aiChannels.stop, aiSchemas.stop, ({ sessionId }) => {
    running.get(sessionId)?.abort()
  })

  handle(aiChannels.approve, aiSchemas.approve, ({ approvalId, approved }) => {
    if (!approvals.settle(approvalId, approved)) throw new UserError('That request is no longer waiting.')
  })

  handle(aiChannels.history, aiSchemas.history, () => {
    if (!dbState.get().isOpen) return { sessionId: null, items: [] }
    const { sessionId } = conversation()
    return {
      sessionId,
      items: sessionId === null ? [] : toChatItems(withToolResults(history.messages(sessionId))),
    }
  })

  handle(aiChannels.clearHistory, aiSchemas.clearHistory, () => {
    const chat = conversation()
    if (chat.sessionId !== null) {
      running.get(chat.sessionId)?.abort()
      if (chat.path === MEMORY_DATABASE) history.deleteSession(chat.sessionId)
      else history.clear(chat.path)
    }
    chat.sessionId = null
  })
}
