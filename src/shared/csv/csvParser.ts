// Port of the CSV reading of reference/sqliteview/ui/dialogs/import_csv.py, which used Python's csv
// module (doublequote, strict=False, QUOTE_MINIMAL or QUOTE_NONE). Incremental: text can arrive in
// chunks, so large files are parsed while they are read.

export interface CsvParseOptions {
  separator: string
  /** '' turns quoting off. */
  quote: string
  /** Strip whitespace around every field. */
  trim: boolean
}

type State = 'startRecord' | 'startField' | 'inField' | 'inQuoted' | 'quoteInQuoted'

export class CsvParser {
  private state: State = 'startRecord'
  private field = ''
  private record: string[] = []
  private rows: string[][] = []
  /** A '\r' ended the last record; a following '\n' belongs to it. */
  private skipLf = false

  constructor(private readonly opts: CsvParseOptions) {}

  /** Parses more text; returns the records completed so far. Empty lines are skipped. */
  push(text: string): string[][] {
    const { separator, quote } = this.opts
    for (const ch of text) {
      if (this.skipLf) {
        this.skipLf = false
        if (ch === '\n') continue
      }
      if (this.state === 'startRecord') {
        if (ch === '\r' || ch === '\n') {
          this.skipLf = ch === '\r'
          continue
        }
        this.state = 'startField'
      }
      switch (this.state) {
        case 'startField':
          if (quote && ch === quote) this.state = 'inQuoted'
          else if (ch === separator) this.endField()
          else if (ch === '\r' || ch === '\n') this.endRecord(ch)
          else {
            this.field += ch
            this.state = 'inField'
          }
          break
        case 'inField':
          if (ch === separator) this.endField()
          else if (ch === '\r' || ch === '\n') this.endRecord(ch)
          else this.field += ch
          break
        case 'inQuoted':
          if (ch === quote) this.state = 'quoteInQuoted'
          else this.field += ch
          break
        case 'quoteInQuoted':
          if (ch === quote) {
            this.field += ch
            this.state = 'inQuoted'
          } else if (ch === separator) this.endField()
          else if (ch === '\r' || ch === '\n') this.endRecord(ch)
          else {
            this.field += ch
            this.state = 'inField'
          }
          break
      }
    }
    return this.take()
  }

  /** Ends the input; returns the last record if the text didn't end with a newline. */
  finish(): string[][] {
    if (this.state !== 'startRecord') this.endRecord('')
    return this.take()
  }

  private take(): string[][] {
    const rows = this.rows
    this.rows = []
    return rows
  }

  private endField(): void {
    this.record.push(this.opts.trim ? this.field.trim() : this.field)
    this.field = ''
    this.state = 'startField'
  }

  private endRecord(ch: string): void {
    this.endField()
    this.rows.push(this.record)
    this.record = []
    this.state = 'startRecord'
    this.skipLf = ch === '\r'
  }
}

/** Parses a whole text at once. */
export function parseCsv(text: string, opts: CsvParseOptions): string[][] {
  const parser = new CsvParser(opts)
  return [...parser.push(text), ...parser.finish()]
}
