// The MCP endpoint: Streamable HTTP on 127.0.0.1, stateless (a fresh server per request), behind a
// bearer token. Browsers are kept out by the Host and Origin checks (DNS rebinding, cross-site POSTs).
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { MCP_PATH } from './connectCommand'

const MAX_BODY_BYTES = 2 * 1024 * 1024

export interface McpHttpOptions {
  /** 0 picks a free port (tests). */
  port: number
  /** Read on every request, so a new token applies at once. */
  token: () => string
  createServer: () => McpServer
}

export interface McpHttpServer {
  port: number
  close(): Promise<void>
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const digest = (s: string): Buffer => createHash('sha256').update(s).digest()

function authorized(header: string | undefined, token: string): boolean {
  const given = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  return timingSafeEqual(digest(given), digest(token))
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Request too large'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new HttpError(400, 'Request body is not JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendError(res: ServerResponse, status: number, message: string): void {
  if (res.headersSent) {
    res.end()
    return
  }
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }))
}

export function startMcpHttp(options: McpHttpOptions): Promise<McpHttpServer> {
  const http = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      if (err instanceof HttpError) return sendError(res, err.status, err.message)
      console.error('[mcp] request failed', err)
      sendError(res, 500, 'Internal error')
    })
  })

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { port } = http.address() as AddressInfo
    if (new URL(req.url ?? '/', 'http://127.0.0.1').pathname !== MCP_PATH)
      throw new HttpError(404, 'Not found')
    const host = req.headers.host
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) throw new HttpError(403, 'Forbidden')
    if (req.headers.origin !== undefined) throw new HttpError(403, 'Forbidden')
    if (!authorized(req.headers.authorization, options.token())) throw new HttpError(401, 'Unauthorized')
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

    const body = await readJson(req)
    const server = options.createServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    res.on('close', () => {
      void transport.close()
      void server.close()
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, body)
  }

  return new Promise((resolve, reject) => {
    http.once('error', reject)
    http.listen(options.port, '127.0.0.1', () => {
      http.off('error', reject)
      resolve({
        port: (http.address() as AddressInfo).port,
        close: () =>
          new Promise((done) => {
            http.closeAllConnections()
            http.close(() => done())
          }),
      })
    })
  })
}
