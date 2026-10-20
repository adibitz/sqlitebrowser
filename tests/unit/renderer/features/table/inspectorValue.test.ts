import { describe, expect, it } from 'vitest'
import {
  autoMode,
  hexDump,
  parseHex,
  textForMode,
  typeInfo,
  valueFromEditor,
} from '@/features/table/inspector/inspectorValue'

describe('inspector values', () => {
  it('round-trips a hex dump and accepts plain hex', () => {
    const data = Uint8Array.from({ length: 20 }, (_, i) => i * 13)
    const dump = hexDump(data)
    expect(dump.split('\n')[0]).toMatch(/^00000000 {2}00 0D 1A/)
    expect(parseHex(dump)).toEqual(data)
    expect(parseHex('00ff 10')).toEqual(Uint8Array.of(0, 255, 16))
    expect(() => parseHex('abc')).toThrow(/Invalid hex/)
  })

  it('picks the display mode like upstream', () => {
    expect(autoMode(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image')
    expect(autoMode(Uint8Array.of(0, 1, 2))).toBe('hex')
    expect(autoMode('{"a": 1}')).toBe('json')
    expect(autoMode('{not json')).toBe('text')
    expect(autoMode(5n)).toBe('text')
  })

  it('describes the stored type', () => {
    expect(typeInfo(null).type).toBe('NULL')
    expect(typeInfo(1n).type).toBe('INTEGER')
    expect(typeInfo(1.5).type).toBe('REAL')
    expect(typeInfo('héllo')).toEqual({ type: 'TEXT', detail: '5 characters' })
    expect(typeInfo(Uint8Array.of(1, 2)).detail).toBe('2.00 B')
  })

  it('keeps compact JSON compact and turns hex into bytes', () => {
    expect(textForMode('{"a":1}', 'json')).toBe('{\n  "a": 1\n}')
    expect(valueFromEditor('{\n  "a": 2\n}', 'json', '{"a":1}')).toBe('{"a":2}')
    expect(valueFromEditor('{\n  "a": 2\n}', 'json', '{\n"a":1}')).toBe('{\n  "a": 2\n}')
    expect(valueFromEditor('0102', 'hex', null)).toEqual(Uint8Array.of(1, 2))
  })
})
