import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useChatStore } from '@/store/chat'
import { useDbStore } from '@/store/db'

/** Applies chat events from main; grids reload after the assistant changed data. */
export function useChatEvents(): void {
  useEffect(
    () =>
      api.ai.onChat((event) => {
        useChatStore.getState().apply(event)
        if (event.kind === 'done' && event.dataChanged) useDbStore.getState().bumpDataVersion()
      }),
    [],
  )
}
