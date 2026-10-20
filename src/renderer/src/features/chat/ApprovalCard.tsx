import { useState } from 'react'
import { ShieldQuestionIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatItem } from '@shared/types/chat'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { useChatStore } from '@/store/chat'

type Approval = Extract<ChatItem, { kind: 'approval' }>

const STATE_TEXT = { approved: 'Approved', denied: 'Denied' } as const

/** A change the model wants to make: the exact SQL, and Approve / Deny. */
export function ApprovalCard({ item }: { item: Approval }) {
  const approve = useChatStore((s) => s.approve)
  const [sending, setSending] = useState(false)
  const answer = async (approved: boolean): Promise<void> => {
    setSending(true)
    try {
      await approve(item.approvalId, approved)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      aria-label="Change waiting for approval"
      className="flex flex-col gap-2 rounded-card border border-warning bg-warning-tint/40 p-3 text-label"
    >
      <p className="flex items-center gap-2 font-medium text-warning-ink">
        <ShieldQuestionIcon className="size-4" />
        {item.state === 'pending' ? 'Run this change?' : STATE_TEXT[item.state]}
      </p>
      <pre className="max-h-48 overflow-auto rounded-xs bg-card p-2 font-mono whitespace-pre-wrap select-text">
        {item.sql}
      </pre>
      {item.state === 'pending' ? (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="xs" disabled={sending} onClick={() => void answer(false)}>
            Deny
          </Button>
          <Button size="xs" disabled={sending} onClick={() => void answer(true)}>
            Approve
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {item.state === 'approved'
            ? 'It is pending until you write changes; Revert undoes it.'
            : 'Nothing was run.'}
        </p>
      )}
    </section>
  )
}
