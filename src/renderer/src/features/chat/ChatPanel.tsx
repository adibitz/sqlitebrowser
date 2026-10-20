import { useEffect } from 'react'
import { SparklesIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyNote } from '@/components/EmptyNote'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { useChatStore } from '@/store/chat'
import { useDbStore } from '@/store/db'
import { useModalStore } from '@/store/modals'
import { useSetting } from '@/store/settings'
import { useTabsStore } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { describeTab } from './chatContext'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { ModelPicker } from './ModelPicker'

/** The AI assistant for the open database (plan § 6). */
export function ChatPanel() {
  const { providers, items, busy, send, stop, clear, loadProviders, loadHistory } = useChatStore()
  const dbPath = useDbStore((s) => s.state.path)
  const activeProviderId = useSetting('ai/activeProviderId')
  const activeModel = useSetting('ai/activeModel')
  const provider = providers.find((p) => p.id === activeProviderId) ?? providers[0] ?? null
  const model = (provider && provider.id === activeProviderId && activeModel) || provider?.defaultModel || ''

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])
  useEffect(() => {
    void loadHistory().catch((err: unknown) => toast.error(errorMessage(err)))
  }, [loadHistory, dbPath])

  const onSend = (text: string): void => {
    if (!provider) return
    const { tabs, activeId } = useTabsStore.getState()
    const context = { activeTab: describeTab(tabs.find((t) => t.id === activeId)) }
    void send(text, context, provider.id, model)
  }

  return (
    <aside aria-label="Assistant" className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <SparklesIcon className="size-4 text-signal" />
        <h2 className="font-medium">Assistant</h2>
        <div className="ml-auto flex min-w-0 items-center gap-1">
          {providers.length > 0 && <ModelPicker providers={providers} provider={provider} model={model} />}
          <TooltipIconButton
            label="Clear the conversation"
            disabled={!items.length}
            onClick={() => void clear().catch((err: unknown) => toast.error(errorMessage(err)))}
          >
            <Trash2Icon />
          </TooltipIconButton>
          <TooltipIconButton label="Close the assistant" onClick={() => useUiStore.getState().toggleChat()}>
            <XIcon />
          </TooltipIconButton>
        </div>
      </header>
      {providers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <EmptyNote>Add an AI provider to chat about this database.</EmptyNote>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => useModalStore.getState().show({ kind: 'preferences' })}
          >
            Open Preferences
          </Button>
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyNote>
                Ask about the tables and data of this database. Reads run at once; changes wait for your
                approval.
              </EmptyNote>
            </div>
          ) : (
            <MessageList items={items} busy={busy} />
          )}
          <Composer busy={busy} disabled={!model} onSend={onSend} onStop={() => void stop()} />
        </>
      )}
    </aside>
  )
}
