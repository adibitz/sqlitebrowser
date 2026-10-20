import { useEffect } from 'react'
import type { UiRequest } from '@shared/types/mcp'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useTabsStore } from '@/store/tabs'
import { runUiAction } from './uiActions'
import { uiSnapshot } from './uiSnapshot'

const REPORT_DELAY_MS = 150

function report(): Promise<void> {
  const { tabs, activeId } = useTabsStore.getState()
  return api.mcp.reportUi(uiSnapshot(tabs, activeId))
}

async function answer({ requestId, action }: UiRequest): Promise<void> {
  try {
    await runUiAction(action)
    // Before the reply, so the client's next get_app_state sees what the action did.
    await report()
    await api.mcp.reply({ requestId, ok: true })
  } catch (err) {
    await api.mcp.reply({ requestId, ok: false, message: errorMessage(err) })
  }
}

/** Carries out what MCP tools ask the window to do, and keeps main told what the window shows. */
export function useMcpBridge(): void {
  useEffect(() => api.mcp.onUiRequest((request) => void answer(request)), [])

  useEffect(() => {
    void report()
    let timer: ReturnType<typeof setTimeout> | undefined
    const off = useTabsStore.subscribe(() => {
      clearTimeout(timer)
      timer = setTimeout(() => void report(), REPORT_DELAY_MS)
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [])
}
