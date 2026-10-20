// Port of reference/tests/test_core.py::test_data_helpers, plus value formatting.
import { describe, expect, it } from 'vitest'
import {
  formatReal,
  humanReadableSize,
  imageFormat,
  isBinary,
  isTextOnly,
  parseClipboard,
  removeCommentsFromQuery,
  stripBom,
  valueToText,
} from '@shared/format/data'

const bytes = (...b: number[]): Uint8Array => Uint8Array.from(b)

describe('data helpers', () => {
  it('strips a leading byte order mark from text', () => {
    expect(stripBom(String.fromCharCode(0xfeff) + 'SELECT 1')).toBe('SELECT 1')
    expect(stripBom('SELECT 1')).toBe('SELECT 1')
  })

  it('tells text from binary', () => {
    expect(isTextOnly(new TextEncoder().encode('hello'))).toBe(true)
    expect(isTextOnly(bytes(0, 1, 2))).toBe(false)
    expect(isBinary(bytes(0x89, 0x50, 0x4e, 0x47, 0, 0))).toBe(true)
    expect(isBinary('text')).toBe(false)
    expect(isTextOnly(bytes(0xef, 0xbb, 0xbf, 0xff))).toBe(true) // BOM wins
  })

  it('strips comments outside quotes', () => {
    expect(removeCommentsFromQuery('SELECT 1 -- x\n/* y */')).toBe('SELECT 1')
    expect(removeCommentsFromQuery("SELECT '--not a comment'")).toBe("SELECT '--not a comment'")
  })

  it('parses clipboard text', () => {
    expect(parseClipboard('a\tb\n1\t2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseClipboard('"x\ty"\tz')).toEqual([['x\ty', 'z']])
    expect(parseClipboard('')).toEqual([])
  })

  it('detects image formats', () => {
    expect(imageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('PNG')
    expect(imageFormat(new TextEncoder().encode('  <svg xmlns="x"/>'))).toBe('SVG')
    expect(imageFormat('PNG')).toBe('')
  })
})

describe('valueToText', () => {
  it('formats every SQLite type like the original', () => {
    expect(valueToText(null)).toBe('')
    expect(valueToText(12n)).toBe('12')
    expect(valueToText(9007199254740993n)).toBe('9007199254740993')
    expect(valueToText(1.5)).toBe('1.5')
    expect(valueToText(new TextEncoder().encode('hi'))).toBe('hi')
  })

  it('prints REAL with 15 significant digits and keeps .0 on whole numbers', () => {
    expect(formatReal(1)).toBe('1.0')
    expect(formatReal(0.1 + 0.2)).toBe('0.3')
    expect(formatReal(1e20)).toBe('1e+20')
    expect(formatReal(1.5e-7)).toBe('1.5e-07')
    expect(formatReal(123456789012345.6)).toBe('123456789012346.0')
    expect(formatReal(-0)).toBe('-0.0')
    expect(formatReal(Infinity)).toBe('Inf')
    expect(formatReal(NaN)).toBe('NaN')
  })

  it('formats sizes', () => {
    expect(humanReadableSize(512)).toBe('512.00 B')
    expect(humanReadableSize(2048)).toBe('2.00 KiB')
  })
})
