import { MEMORY_DATABASE } from '@shared/types/db'

/** Last path segment, for either separator; "In-memory database" for ':memory:'. */
export function fileName(path: string): string {
  if (path === MEMORY_DATABASE) return 'In-memory database'
  return path.split(/[\\/]/).pop() || path
}
