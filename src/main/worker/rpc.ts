import type { Worker } from 'node:worker_threads'
import createWorker from './entry?nodeWorker'
import type { WorkerHandlers, WorkerMethod } from './handlers/registry'
import type { WorkerEvent, WorkerMessage, WorkerRequest } from './protocol'

type Args<M extends WorkerMethod> = Parameters<WorkerHandlers[M]>[0]
type Result<M extends WorkerMethod> = Awaited<ReturnType<WorkerHandlers[M]>>

export interface DbWorker {
  call<M extends WorkerMethod>(
    method: M,
    ...args: Args<M> extends undefined ? [] : [Args<M>]
  ): Promise<Result<M>>
  onEvent(listener: (event: WorkerEvent) => void): void
  stop(): Promise<void>
}

/** Error thrown inside the worker, carried back with its original name and message. */
export class WorkerError extends Error {
  constructor(name: string, message: string) {
    super(message)
    this.name = name
  }
}

export function startDbWorker(): DbWorker {
  const worker: Worker = createWorker({})
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  const listeners: ((event: WorkerEvent) => void)[] = []
  let nextId = 1

  worker.on('message', (msg: WorkerMessage) => {
    if (msg.type === 'event') {
      for (const listener of listeners) listener(msg.event)
      return
    }
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.ok) entry.resolve(msg.result)
    else entry.reject(new WorkerError(msg.error.name, msg.error.message))
  })

  const failAll = (err: Error): void => {
    for (const { reject } of pending.values()) reject(err)
    pending.clear()
  }
  worker.on('error', failAll)
  worker.on('exit', (code) => failAll(new Error(`DB worker stopped (exit code ${code})`)))

  return {
    call(method, ...args) {
      const id = nextId++
      const request: WorkerRequest = { id, method, args: args[0] }
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
        worker.postMessage(request)
      })
    },
    onEvent(listener) {
      listeners.push(listener)
    },
    async stop() {
      await worker.terminate()
    },
  }
}
