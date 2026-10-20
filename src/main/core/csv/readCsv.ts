// Reads a CSV file in chunks: decoded with TextDecoder (any encoding it knows) and parsed as it goes,
// so large files never sit in memory as one string.
import { closeSync, openSync, readSync } from 'node:fs'
import { CsvParser } from '@shared/csv/csvParser'
import type { CsvReadOptions } from '@shared/csv/csvOptions'

const CHUNK = 1024 * 1024

export class StopReading extends Error {}

function decoderFor(encoding: string): TextDecoder {
  try {
    // UTF-8 / UTF-16 byte order marks are dropped, like Python's utf-8-sig.
    return new TextDecoder(encoding.trim() || 'utf-8')
  } catch {
    throw new Error(`Unknown text encoding: ${encoding}`)
  }
}

/**
 * Calls `onRows` with each batch of parsed records. Throw StopReading from it to stop early.
 * Returns the number of bytes read.
 */
export function readCsv(path: string, opts: CsvReadOptions, onRows: (rows: string[][]) => void): number {
  const decoder = decoderFor(opts.encoding)
  const parser = new CsvParser(opts)
  const fd = openSync(path, 'r')
  const buffer = Buffer.allocUnsafe(CHUNK)
  let total = 0
  try {
    for (;;) {
      const n = readSync(fd, buffer, 0, CHUNK, null)
      if (n === 0) break
      total += n
      const rows = parser.push(decoder.decode(buffer.subarray(0, n), { stream: true }))
      if (rows.length) onRows(rows)
    }
    const rows = [...parser.push(decoder.decode()), ...parser.finish()]
    if (rows.length) onRows(rows)
  } catch (err) {
    if (!(err instanceof StopReading)) throw err
  } finally {
    closeSync(fd)
  }
  return total
}

/** The first `count` records of a file. */
export function readCsvHead(path: string, opts: CsvReadOptions, count: number): string[][] {
  const head: string[][] = []
  readCsv(path, opts, (rows) => {
    head.push(...rows.slice(0, count - head.length))
    if (head.length >= count) throw new StopReading()
  })
  return head
}
