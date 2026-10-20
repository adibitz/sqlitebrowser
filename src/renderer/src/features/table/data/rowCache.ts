import type { SqlValue } from '@shared/types/values'

/** Rows are fetched in chunks of this size (the Python model used db/prefetchsize-sized windows). */
export const CHUNK_SIZE = 250

type Fetch = (offset: number, limit: number) => Promise<SqlValue[][]>

/**
 * Lazily loaded rows of one browse query (port of the RowCache/RowLoader idea): the row count comes
 * from a separate COUNT(*), rows arrive in chunks as the grid scrolls. Subscribable for React's
 * useSyncExternalStore; a new instance is made whenever the query or data changes.
 */
export class RowCache {
  total: number | null = null
  error: string | null = null
  private version = 0
  private readonly chunks = new Map<number, SqlValue[][]>()
  private readonly pending = new Map<number, Promise<void>>()
  private readonly listeners = new Set<() => void>()
  private disposed = false

  constructor(
    private readonly fetchCount: () => Promise<number>,
    private readonly fetchRows: Fetch,
    private readonly describeError: (err: unknown) => string = String,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getVersion = (): number => this.version

  private emit(): void {
    if (this.disposed) return
    this.version++
    for (const l of this.listeners) l()
  }

  /**
   * Loads the row count; call after creating the cache. React StrictMode runs effects twice in development
   * (start, dispose, start on the same cache), so starting again undoes dispose.
   */
  start(): void {
    this.disposed = false
    this.fetchCount().then(
      (n) => {
        this.total = n
        this.emit()
      },
      (err) => {
        this.error = this.describeError(err)
        this.emit()
      },
    )
  }

  dispose(): void {
    this.disposed = true
    this.listeners.clear()
  }

  rowAt(index: number): SqlValue[] | undefined {
    return this.chunks.get(Math.floor(index / CHUNK_SIZE))?.[index % CHUNK_SIZE]
  }

  private loadChunk(chunk: number): Promise<void> {
    const existing = this.pending.get(chunk)
    if (existing) return existing
    if (this.chunks.has(chunk)) return Promise.resolve()
    const promise = this.fetchRows(chunk * CHUNK_SIZE, CHUNK_SIZE).then(
      (rows) => {
        this.pending.delete(chunk)
        this.chunks.set(chunk, rows)
        this.emit()
      },
      (err) => {
        this.pending.delete(chunk)
        this.error = this.describeError(err)
        this.emit()
      },
    )
    this.pending.set(chunk, promise)
    return promise
  }

  /** Starts loading rows [start, end) that aren't cached yet. */
  ensure(start: number, end: number): void {
    if (end <= start) return
    for (let c = Math.floor(start / CHUNK_SIZE); c <= Math.floor((end - 1) / CHUNK_SIZE); c++)
      void this.loadChunk(c)
  }

  /** Rows [start, end), loading whatever is missing first (for copy and export of selections). */
  async range(start: number, end: number): Promise<SqlValue[][]> {
    const loads: Promise<void>[] = []
    for (let c = Math.floor(start / CHUNK_SIZE); c <= Math.floor((end - 1) / CHUNK_SIZE); c++)
      loads.push(this.loadChunk(c))
    await Promise.all(loads)
    const rows: SqlValue[][] = []
    for (let i = start; i < end; i++) {
      const row = this.rowAt(i)
      if (row) rows.push(row)
    }
    return rows
  }

  /** Replaces one value after an edit, without reloading. The row gets a new identity so it re-renders. */
  patch(index: number, column: number, value: SqlValue): void {
    const chunk = this.chunks.get(Math.floor(index / CHUNK_SIZE))
    const row = chunk?.[index % CHUNK_SIZE]
    if (!chunk || !row) return
    const copy = [...row]
    copy[column] = value
    chunk[index % CHUNK_SIZE] = copy
    this.emit()
  }
}
