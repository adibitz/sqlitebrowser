import { useEffect, useState } from 'react'
import { CopyIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { McpStatus } from '@shared/types/mcp'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'

function statusText(status: McpStatus): string {
  if (status.state === 'running') return `Running at ${status.url}`
  if (status.state === 'error') return status.message
  return 'Off'
}

/** The server's live state and how to connect Claude Code to it (the token never leaves main). */
export function McpConnectionControl() {
  const [status, setStatus] = useState<McpStatus>({ state: 'off' })

  useEffect(() => {
    void api.mcp.status().then(setStatus)
    return api.mcp.onStatus(setStatus)
  }, [])

  const copy = async (): Promise<void> => {
    try {
      await api.mcp.copyCommand()
      toast.success('Command copied. Run it in a terminal, then restart Claude Code.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const regenerate = async (): Promise<void> => {
    try {
      await api.mcp.regenerateToken()
      toast.success('New token made. Copy the command again and run it to reconnect Claude Code.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <span className="text-muted-foreground">Status</span>
      <p
        role="status"
        aria-label="MCP server status"
        className={cn('flex items-center gap-2', status.state === 'error' && 'text-destructive')}
      >
        <span
          aria-hidden
          className={cn(
            'size-2 shrink-0 rounded-full',
            status.state === 'running'
              ? 'bg-success'
              : status.state === 'error'
                ? 'bg-destructive'
                : 'bg-hover-stroke',
          )}
        />
        {statusText(status)}
      </p>
      <span className="self-start pt-1.5 text-muted-foreground">Claude Code</span>
      <div className="flex flex-col items-start gap-2">
        <div className="flex gap-2">
          <Button size="sm" disabled={status.state !== 'running'} onClick={() => void copy()}>
            <CopyIcon /> Copy Claude Code command
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void regenerate()}>
            <RefreshCwIcon /> New token
          </Button>
        </div>
        <p className="text-label text-muted-foreground">
          The command adds SQliteView to Claude Code with a private token. A new token disconnects every
          client added with the old one.
        </p>
      </div>
    </>
  )
}
