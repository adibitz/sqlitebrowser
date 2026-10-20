export interface RecentFile {
  path: string
  name: string
  folder: string
  exists: boolean
  /** bytes, or null when the file is missing */
  size: number | null
  /** ms since epoch, or null when the file is missing */
  modified: number | null
  readOnly: boolean
}
