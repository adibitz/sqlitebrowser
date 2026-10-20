import { randomBytes } from 'node:crypto'
import type { SecretValueStore } from '../prefs/secretValues'

const NAME = 'mcp/token'

/** The bearer token MCP clients send; made on first use and kept until the user replaces it. */
export interface McpToken {
  get(): string
  regenerate(): string
}

export function createMcpToken(store: SecretValueStore): McpToken {
  let current: string | null = null
  const replace = (): string => {
    current = randomBytes(32).toString('base64url')
    store.set(NAME, current)
    return current
  }
  return {
    get: () => (current ??= store.get(NAME) ?? replace()),
    regenerate: replace,
  }
}
