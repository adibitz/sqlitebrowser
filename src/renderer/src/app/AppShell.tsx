import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { DialogHost } from '@/components/dialogs/DialogHost'
import { ModalHost } from '@/app/ModalHost'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { PlotPanel } from '@/features/plot/PlotPanel'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DocumentArea } from '@/features/documents/DocumentArea'
import { LogPanel } from '@/features/log/LogPanel'
import { Explorer } from '@/features/explorer/Explorer'
import { CommandPalette } from '@/features/palette/CommandPalette'
import { WelcomePage } from '@/features/welcome/WelcomePage'
import { connectDbStore, useDbStore } from '@/store/db'
import { useSetting } from '@/store/settings'
import { useUiStore } from '@/store/ui'
import { useCommands } from './commands'
import { DropOverlay } from './DropOverlay'
import { StatusBar } from './StatusBar'
import { Toolbar } from './toolbar/Toolbar'
import { useFileDrop } from './useFileDrop'
import { useExitFullScreenOnEscape } from './useExitFullScreenOnEscape'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { useIdentifierQuoting } from './useIdentifierQuoting'
import { useChatEvents } from './useChatEvents'
import { useOpenRequests } from './useOpenRequests'
import { useReportUnsavedDocuments } from './useReportUnsavedDocuments'

/** The main window after onboarding: toolbar, explorer + documents (or the start page), status bar. */
export function AppShell() {
  const isOpen = useDbStore((s) => s.state.isOpen)
  const explorerVisible = useUiStore((s) => s.explorerVisible)
  const fullScreen = useUiStore((s) => s.fullScreen)
  const logVisible = useUiStore((s) => s.logVisible)
  const plotVisible = useUiStore((s) => s.plotVisible)
  const aiEnabled = useSetting('ai/enabled') ?? false
  const chatVisible = useUiStore((s) => s.chatVisible) && aiEnabled
  const commands = useCommands()
  const dragging = useFileDrop()
  useGlobalShortcuts(commands)
  useExitFullScreenOnEscape()
  useReportUnsavedDocuments()
  useIdentifierQuoting()
  useOpenRequests()
  useChatEvents()
  useEffect(() => connectDbStore(), [])

  return (
    <TooltipProvider delay={400}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        {!fullScreen && <Toolbar commands={commands} />}
        {isOpen ? (
          <ResizablePanelGroup orientation="horizontal">
            {explorerVisible && !fullScreen && (
              <>
                <ResizablePanel id="explorer" defaultSize={272} minSize={200} maxSize="45%">
                  <Explorer />
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}
            <ResizablePanel id="documents" minSize={320}>
              {logVisible && !fullScreen ? (
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel id="document" minSize={160}>
                    <DocumentArea />
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel id="log" defaultSize={200} minSize={96} maxSize="60%">
                    <LogPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <DocumentArea />
              )}
            </ResizablePanel>
            {plotVisible && !fullScreen && (
              <>
                <ResizableHandle />
                <ResizablePanel id="plot" defaultSize={420} minSize={280} maxSize="60%">
                  <PlotPanel />
                </ResizablePanel>
              </>
            )}
            {chatVisible && !fullScreen && (
              <>
                <ResizableHandle />
                <ResizablePanel id="chat" defaultSize={400} minSize={300} maxSize="50%">
                  <ChatPanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        ) : (
          <WelcomePage commands={commands} />
        )}
        {!fullScreen && <StatusBar />}
      </div>
      {dragging && <DropOverlay />}
      <CommandPalette commands={commands} />
      <ModalHost />
      <DialogHost />
      <Toaster position="bottom-right" offset={{ bottom: 72, right: 16 }} />
    </TooltipProvider>
  )
}
