import { useEffect } from 'react'
import { handleOpenRequest } from '@/features/database/openRequest'
import { api } from '@/lib/api'

/** The command line request is taken once per window, even when effects run twice in development. */
let startupTaken = false

/** Opens what the command line or another launch asks for. */
export function useOpenRequests(): void {
  useEffect(() => {
    if (!startupTaken) {
      startupTaken = true
      void api.app.takeStartupRequest().then((request) => request && handleOpenRequest(request))
    }
    return api.app.onOpenRequest((request) => void handleOpenRequest(request))
  }, [])
}
