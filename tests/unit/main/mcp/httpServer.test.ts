// The HTTP endpoint with a real MCP client over Streamable HTTP, on a free port of 127.0.0.1.
import { request } from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterEach, describe, expect, it } from 'vitest'
import { startMcpHttp, type McpHttpServer } from '../../../../src/main/mcp/httpServer'

const TOKEN = 'test-token'
let running: McpHttpServer | null = null

afterEach(async () => {
  await running?.close()
  running = null
})

async function start(): Promise<string> {
  running = await startMcpHttp({
    port: 0,
    token: () => TOKEN,
    createServer: () => {
      const server = new McpServer({ name: 'test', version: '1.0.0' })
      server.registerTool('ping', { description: 'Answers pong', inputSchema: {} }, () => ({
        content: [{ type: 'text', text: 'pong' }],
      }))
      return server
    },
  })
  return `http://127.0.0.1:${running.port}`
}

const initialize = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'curl', version: '1' } },
})

function post(url: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: initialize,
  })
}

/** Status of a POST with a forged Host header (fetch doesn't let a caller set Host). */
function postWithHost(base: string, host: string): Promise<number> {
  const { port } = new URL(base)
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: { host, authorization: `Bearer ${TOKEN}` },
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
      },
    )
    req.on('error', reject)
    req.end(initialize)
  })
}

describe('MCP HTTP endpoint', () => {
  it('serves the tools to a client that sends the token', async () => {
    const base = await start()
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
      }),
    )
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual(['ping'])
    const result = await client.callTool({ name: 'ping', arguments: {} })
    expect(result.content).toEqual([{ type: 'text', text: 'pong' }])
    await client.close()
  })

  it('refuses requests without the right token', async () => {
    const base = await start()
    expect((await post(`${base}/mcp`)).status).toBe(401)
    expect((await post(`${base}/mcp`, { authorization: 'Bearer wrong' })).status).toBe(401)
    expect((await post(`${base}/mcp`, { authorization: `Bearer ${TOKEN}` })).status).toBe(200)
  })

  it('refuses browsers and other hosts', async () => {
    const base = await start()
    const auth = { authorization: `Bearer ${TOKEN}` }
    expect((await post(`${base}/mcp`, { ...auth, origin: 'https://evil.example' })).status).toBe(403)
    expect(await postWithHost(base, 'evil.example')).toBe(403)
    expect(await postWithHost(base, `evil.example:${new URL(base).port}`)).toBe(403)
    expect((await post(`${base}/other`, auth)).status).toBe(404)
    expect((await fetch(`${base}/mcp`, { headers: auth })).status).toBe(405)
  })

  it('reports a port that is already taken', async () => {
    const base = await start()
    const port = Number(new URL(base).port)
    await expect(
      startMcpHttp({
        port,
        token: () => TOKEN,
        createServer: () => new McpServer({ name: 't', version: '1' }),
      }),
    ).rejects.toMatchObject({ code: 'EADDRINUSE' })
  })
})
