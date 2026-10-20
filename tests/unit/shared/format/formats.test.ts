// Port of the engine parts of reference/tests/test_formats_plot.py (display and conditional formats).
import { describe, expect, it } from 'vitest'
import {
  addCondFormat,
  neverMatches,
  readableTextColor,
  ruleColors,
  type CondFormat,
} from '@shared/format/condFormat'
import { displayFormatShapeError, matchPreset, presetSelector } from '@shared/format/displayFormat'

const rule = (filter: string, fg = '', bg = ''): CondFormat => ({ filter, fg, bg })

describe('display format presets', () => {
  it('round-trips presets and recognises custom expressions', () => {
    expect(presetSelector('upper', 'na me')).toBe('upper("na me")')
    expect(presetSelector('default', 'x')).toBe('"x"')
    expect(matchPreset('upper("x")', 'x')).toBe('upper')
    expect(matchPreset('"x"', 'x')).toBe('default')
    expect(matchPreset('', 'x')).toBe('default')
    expect(matchPreset('substr("x", 1, 2)', 'x')).toBe('custom')
  })

  it('needs a function call applied to the column', () => {
    expect(displayFormatShapeError('upper("name")', 'name')).toBe('')
    expect(displayFormatShapeError('"name"', 'name')).toBe('')
    expect(displayFormatShapeError('42', 'name')).toMatch(/function call applied to "name"/)
    expect(displayFormatShapeError('upper("other")', 'name')).toMatch(/function call/)
  })
})

describe('conditional formats', () => {
  it('puts new conditions first, keeps the catch-all last and replaces the same condition', () => {
    const a = rule('>100', '#111111')
    const b = rule('>10', '#222222')
    const catchAll = rule('', '', '#333333')
    let formats = addCondFormat([], catchAll)
    formats = addCondFormat(formats, b)
    formats = addCondFormat(formats, a)
    expect(formats).toEqual([a, b, catchAll])
    expect(addCondFormat(formats, rule('>10', '#999999')).map((f) => f.fg)).toEqual([
      '#111111',
      '#999999',
      '',
    ])
  })

  it('spots conditions that never match', () => {
    expect(neverMatches('%')).toBe(true)
    expect(neverMatches('')).toBe(false)
    expect(neverMatches('>5')).toBe(false)
  })

  it('keeps text legible on a background-only rule', () => {
    expect(readableTextColor('#fff4c2')).toBe('#1d2127')
    expect(readableTextColor('#202020')).toBe('#f1f3f8')
    expect(ruleColors(rule('', '', '#202020'))).toEqual({ color: '#f1f3f8', backgroundColor: '#202020' })
    expect(ruleColors(rule('', '#aa0000'))).toEqual({ color: '#aa0000' })
  })
})
