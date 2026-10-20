import { writeSync } from 'node:fs'

export interface BufferedWriter {
  write(s: string): void
  flush(): void
}

/** Buffered writer: one syscall per 64 KiB instead of per value. */
export function bufferedWriter(fd: number): BufferedWriter {
  let buf = ''
  return {
    write(s) {
      buf += s
      if (buf.length >= 65536) {
        writeSync(fd, buf)
        buf = ''
      }
    },
    flush() {
      if (buf) writeSync(fd, buf)
      buf = ''
    },
  }
}
