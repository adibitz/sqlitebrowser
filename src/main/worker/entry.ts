// DB worker: owns the user's database connection so long queries never block the main process.
import { parentPort } from 'node:worker_threads'
import { handlers } from './handlers/registry'
import type { WorkerMessage, WorkerRequest } from './protocol'
import { drainEvents } from './session'

const port = parentPort
if (!port) throw new Error('worker/entry.ts must run as a worker thread')

type AnyHandler = (args: unknown) => unknown

// Requests run one at a time, in arrival order, like the single connection they share.
let queue: Promise<void> = Promise.resolve()

port.on('message', (req: WorkerRequest) => {
  queue = queue.then(() => run(req))
})

function post(message: WorkerMessage): void {
  port!.postMessage(message)
}

async function run({ id, method, args }: WorkerRequest): Promise<void> {
  let response: WorkerMessage
  try {
    const handler = (handlers as Record<string, AnyHandler>)[method]
    if (!handler) throw new Error(`Unknown worker method: ${method}`)
    response = { type: 'response', id, ok: true, result: await handler(args) }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    response = { type: 'response', id, ok: false, error: { name: error.name, message: error.message } }
  }
  // Events first, so the UI has the new state by the time the call resolves.
  for (const event of drainEvents()) post({ type: 'event', event })
  post(response)
}
