import type { ChatContext } from '@shared/types/chat'

export interface DatabaseFacts {
  /** File name, or 'an in-memory database'. */
  name: string
  readOnly: boolean
}

/** Instructions for the model: what it works on, how the tools behave, and what the user sees. */
export function systemPrompt(db: DatabaseFacts, context: ChatContext): string {
  return [
    'You are the assistant in SQliteView, a desktop app for viewing and editing SQLite databases.',
    `The user has ${db.name} open${db.readOnly ? ' read-only, so it cannot be changed' : ''}.`,
    'Look at the schema and data with the tools before answering; never guess table or column names.',
    'Write SQLite SQL. run_query is for reads and runs at once.',
    db.readOnly
      ? 'Do not try to change the database.'
      : 'run_sql changes the database and runs only after the user approves the exact SQL, so say briefly what a change will do before asking. Changes stay pending until the user writes them to the file, and Revert undoes them.',
    'Keep answers short. Show small results as Markdown tables.',
    context.activeTab ? `The user is looking at: ${context.activeTab}.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
