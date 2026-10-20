// The import/export options remembered between runs (port of the dialogs' _save_settings).
import type { CsvReadOptions } from '@shared/csv/csvOptions'
import type { ExportOptions } from '@shared/ipc/io'
import type { Settings } from '@shared/settings/schema'
import { saveSettings } from '@/store/settings'

/** Options of the CSV import that aren't remembered start like this. */
export function csvReadOptionsFrom(s: Settings): CsvReadOptions {
  return {
    header: s['importcsv/firstrowheader'],
    separator: s['importcsv/separator'] || ',',
    quote: s['importcsv/quotecharacter'],
    encoding: s['importcsv/encoding'] || 'UTF-8',
    trim: s['importcsv/trimfields'],
    noTypeDetection: s['importcsv/notypedetection'],
    sanitizeNames: false,
  }
}

export function exportOptionsFrom(s: Settings): ExportOptions {
  return {
    header: s['exportcsv/firstrowheader'],
    separator: s['exportcsv/separator'] || ',',
    quote: s['exportcsv/quotecharacter'],
    newline: s['exportcsv/newlinecharacters'] === '\n' ? '\n' : '\r\n',
    prettyJson: s['exportjson/prettyprint'],
  }
}

export function saveCsvReadOptions(o: CsvReadOptions, separateTables: boolean): Promise<void> {
  return saveSettings({
    'importcsv/firstrowheader': o.header,
    'importcsv/separator': o.separator,
    'importcsv/quotecharacter': o.quote,
    'importcsv/encoding': o.encoding,
    'importcsv/trimfields': o.trim,
    'importcsv/notypedetection': o.noTypeDetection,
    'importcsv/separatetables': separateTables,
  })
}

export function saveExportOptions(o: ExportOptions): Promise<void> {
  return saveSettings({
    'exportcsv/firstrowheader': o.header,
    'exportcsv/separator': o.separator,
    'exportcsv/quotecharacter': o.quote,
    'exportcsv/newlinecharacters': o.newline,
    'exportjson/prettyprint': o.prettyJson,
  })
}
