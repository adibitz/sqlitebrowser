// Electron wraps errors thrown in main as "Error invoking remote method 'x': Error: <message>".
const IPC_PREFIX = /^Error invoking remote method '[^']+': (?:\w*Error: )?/

/** The message to show the user for an error from an api call. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(IPC_PREFIX, '')
}
