// Port of test_formats_plot.py::test_guess_axis_type and ::test_build_plot_data.
import { describe, expect, it } from 'vitest'
import { buildPlotData, guessAxisType, parseTemporal, ROW_NUMBER, toAxisValue } from '@shared/format/plotData'

describe('plot data', () => {
  it('guesses the axis type of a column', () => {
    expect(guessAxisType([1n, 2.5, null, '3'])).toBe('numeric')
    expect(guessAxisType(['2024-01-02', '2024-03-04'])).toBe('date')
    expect(guessAxisType(['2024-01-02', '2024-03-04 10:00:00'])).toBe('dateTime')
    expect(guessAxisType(['10:15:00'])).toBe('time')
    expect(guessAxisType(['IN', 3n])).toBe('label')
    expect(guessAxisType([null, null])).toBeNull()
    expect(guessAxisType([new Uint8Array([0, 1])])).toBeNull()
  })

  it('turns rows into points, skipping rows whose X has no place', () => {
    const rows = [
      [1n, 'b', 10n, '2024-01-01'],
      [2n, 'a', null, '2024-01-02'],
      [3n, 'c', 'x', null],
    ]
    let d = buildPlotData(rows, ROW_NUMBER, [2])
    expect(d.xs).toEqual([1, 2, 3])
    expect(d.ys.get(2)).toEqual([10, null, null])
    d = buildPlotData(rows, 1, [0])
    expect(d.xType).toBe('label')
    expect(d.xs).toEqual([0, 1, 2])
    expect(d.labels).toEqual(['b', 'a', 'c'])
    d = buildPlotData(rows, 3, [0])
    expect(d.xType).toBe('date')
    expect(d.xs).toHaveLength(2)
    expect(d.xs[1]! - d.xs[0]!).toBe(86_400_000)
    expect(toAxisValue('1970-01-01', 'date')).toBe(0)
  })

  it('reads ISO dates and times like Python fromisoformat', () => {
    expect(parseTemporal('2024-02-31')).toBeNull()
    expect(parseTemporal('2024-01-01T01:00:00+01:00')).toEqual({ type: 'dateTime', ms: Date.UTC(2024, 0, 1) })
    expect(parseTemporal('00:00:01.5')).toEqual({ type: 'time', ms: 1500 })
    expect(parseTemporal('IN')).toBeNull()
  })
})
