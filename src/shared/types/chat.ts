/** Chat with an AI model that works on the open database through MCP tools. */

/** A cell value as JSON can carry it (64-bit integers beyond 2^53 become text, BLOBs a note). */
export type JsonCell = string | number | boolean | null

/** What the panel shows for one tool call. */
export interface ToolCallView {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error' | 'denied'
  /** e.g. "Ran query on orders · 42 rows" */
  summary: string
  sql?: string
  /** Rows the call returned (capped), for the expandable result table. */
  table?: { columns: string[]; rows: JsonCell[][]; total: number }
  error?: string
}

export type ChatItem =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'tool'; id: string; call: ToolCallView }
  /** A write the model wants to run; it waits for Approve or Deny. */
  | {
      kind: 'approval'
      id: string
      approvalId: string
      sql: string
      state: 'pending' | 'approved' | 'denied'
    }
  | { kind: 'error'; id: string; text: string }

/** What the user is looking at, sent with each message so the model knows the context. */
export interface ChatContext {
  /** e.g. "table main.customers (filters: country =IN; sorted by name desc)" */
  activeTab: string | null
}

/** Pushed from main while a reply is produced. */
export type ChatEvent =
  | { kind: 'text'; sessionId: number; delta: string }
  | { kind: 'toolCall'; sessionId: number; call: ToolCallView }
  | { kind: 'approval'; sessionId: number; approvalId: string; sql: string }
  | { kind: 'approvalSettled'; sessionId: number; approvalId: string; approved: boolean }
  /** The reply is complete (or failed, or was stopped). */
  | { kind: 'done'; sessionId: number; error?: string; stopped?: boolean; dataChanged: boolean }
