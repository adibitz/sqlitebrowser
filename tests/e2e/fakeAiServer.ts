// A local OpenAI-compatible server with scripted replies, so chat tests need no network or API key.
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface FakeMessage {
  role: string
  content?: string | null
  tool_calls?: { id: string; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

export type FakeReply = { text: string } | { tool: string; args: Record<string, unknown> }

export interface FakeAi {
  /** Base URL to enter in the app, e.g. http://127.0.0.1:1234/v1 */
  url: string
  requests: FakeMessage[][]
  close(): Promise<void>
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => (body += chunk))
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const chunk = (delta: Record<string, unknown>, finish: string | null = null): string =>
  `data: ${JSON.stringify({ id: 'fake', object: 'chat.completion.chunk', model: 'fake-model', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`

/** Starts the server; `script` picks the reply for each request from the conversation so far. */
export async function startFakeAi(script: (messages: FakeMessage[]) => FakeReply): Promise<FakeAi> {
  const requests: FakeMessage[][] = []
  let calls = 0
  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === 'GET' && req.url?.endsWith('/models')) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake-model', object: 'model' }] }))
        return
      }
      if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
        res.writeHead(404).end()
        return
      }
      const body = JSON.parse(await readBody(req)) as { messages: FakeMessage[] }
      requests.push(body.messages)
      const reply = script(body.messages)
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      if ('text' in reply) {
        // Two pieces, so the app has to put streamed text together.
        const half = Math.ceil(reply.text.length / 2)
        res.write(chunk({ role: 'assistant', content: reply.text.slice(0, half) }))
        res.write(chunk({ content: reply.text.slice(half) }))
        res.write(chunk({}, 'stop'))
      } else {
        calls++
        const id = `call_${calls}`
        res.write(
          chunk({
            role: 'assistant',
            tool_calls: [{ index: 0, id, type: 'function', function: { name: reply.tool, arguments: '' } }],
          }),
        )
        res.write(chunk({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(reply.args) } }] }))
        res.write(chunk({}, 'tool_calls'))
      }
      res.end('data: [DONE]\n\n')
    })()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

/** The last user message of a conversation. */
export function lastUserText(messages: FakeMessage[]): string {
  return [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
}
