// Text that Python's int() / float() accept: surrounding whitespace, a sign, digit separators, and
// for float() exponents, inf and nan. The Python app used them for CSV types and plot values.

const INT = /^\s*[+-]?\d+(_\d+)*\s*$/
const FLOAT = /^\s*[+-]?((\d+(_\d+)*)?\.?\d+(_\d+)*([eE][+-]?\d+)?|\d+(_\d+)*\.|inf(inity)?|nan)\s*$/i

export const isIntText = (s: string): boolean => INT.test(s)
export const isRealText = (s: string): boolean => FLOAT.test(s)

/** float(s), or null when Python would raise. */
export function parseRealText(s: string): number | null {
  if (!isRealText(s)) return null
  const t = s.trim().replaceAll('_', '').toLowerCase()
  const sign = t.startsWith('-') ? -1 : 1
  const body = t.replace(/^[+-]/, '')
  if (body === 'nan') return NaN
  if (body === 'inf' || body === 'infinity') return sign * Infinity
  return Number(t)
}
