// Port of PlotPanel._draw: plot data -> uPlot options and aligned data, for lines, points or bars.
import uPlot from 'uplot'
import type { PlotData } from '@shared/format/plotData'
import { MAX_BARS } from './plotChoices'

export type ChartKind = 'line' | 'scatter' | 'bar'

export interface PlotSeries {
  /** Column index into the rows. */
  index: number
  name: string
  /** Colour slot, 0 to 7 (--chart-1 … --chart-8). */
  slot: number
}

/** A theme colour, read when the chart draws, so a theme change only needs a redraw. */
const themeColor = (name: string) => (): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const AXIS = themeColor('--muted-foreground')
const GRID = themeColor('--border')
const SURFACE = themeColor('--card')

const DATE_AXES = new Set(['date', 'dateTime', 'time'])
const MAX_LABELS = 40

/** Bars of several series side by side in each category (uPlot has no grouped bars built in). */
function groupedBars(position: number, count: number): uPlot.Series.PathBuilder {
  return (u, seriesIdx, idx0, idx1) => {
    const path = new Path2D()
    const xs = u.data[0]
    const ys = u.data[seriesIdx]!
    const step = Math.abs(u.valToPos(1, 'x', true) - u.valToPos(0, 'x', true))
    const group = step * 0.8
    const width = group / count
    const zero = u.valToPos(0, 'y', true)
    for (let i = idx0; i <= idx1; i++) {
      const v = ys[i]
      if (v === null || v === undefined) continue
      const left = u.valToPos(xs[i]!, 'x', true) - group / 2 + position * width
      const top = u.valToPos(v, 'y', true)
      path.rect(left, Math.min(top, zero), Math.max(1, width - 1), Math.abs(zero - top))
    }
    return { stroke: path, fill: path }
  }
}

const formatNumber = (v: number): string =>
  Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(2) : String(+v.toPrecision(6))

/** uPlot options (without size) and data for one chart. */
export function buildPlot(
  data: PlotData,
  series: readonly PlotSeries[],
  kind: ChartKind,
  xName: string,
): { options: Omit<uPlot.Options, 'width' | 'height'>; aligned: uPlot.AlignedData } {
  const categorical = kind === 'bar' || data.xType === 'label'
  let order = data.xs.map((_, i) => i)
  if (kind === 'bar') order = order.slice(0, MAX_BARS)
  else if (!categorical) order.sort((a, b) => data.xs[a]! - data.xs[b]!) // uPlot needs ascending X
  const xs = order.map((i, pos) => (categorical ? pos : data.xs[i]!))
  const labels = order.map((i) => data.labels[i]!)
  const aligned: uPlot.AlignedData = [
    xs,
    ...series.map((s) => order.map((i) => data.ys.get(s.index)![i] ?? null)),
  ]

  const axis = (label?: string): uPlot.Axis => ({
    stroke: AXIS,
    grid: { stroke: GRID, width: 1 },
    ticks: { stroke: GRID, width: 1 },
    ...(label && { label, labelSize: 20 }),
  })
  const xAxis: uPlot.Axis = {
    ...axis(xName),
    ...(categorical && {
      values: (_u: uPlot, splits: number[]) =>
        splits.map((v) => (Number.isInteger(v) && labels.length <= MAX_LABELS ? (labels[v] ?? '') : '')),
      rotate: labels.length > 12 ? -45 : 0,
      space: 24,
    }),
  }
  const yAxis: uPlot.Axis = {
    ...axis(series.length === 1 ? series[0]!.name : undefined),
    values: (_u, splits) => splits.map(formatNumber),
    size: 64,
  }

  const options: Omit<uPlot.Options, 'width' | 'height'> = {
    ms: 1,
    tzDate: (ts) => uPlot.tzDate(new Date(ts), 'Etc/UTC'), // dates are UTC wall time, like upstream
    legend: { show: series.length > 1 },
    cursor: { drag: { x: true, y: false } },
    scales: {
      x: {
        time: !categorical && DATE_AXES.has(data.xType),
        ...(kind === 'bar' && { range: [-0.5, xs.length - 0.5] as uPlot.Range.MinMax }),
      },
      y: kind === 'bar' ? { range: (_u, min, max) => [Math.min(0, min), Math.max(0, max)] } : {},
    },
    axes: [xAxis, yAxis],
    series: [
      {
        label: xName,
        value: (_u, v) => (v === null ? '' : categorical ? (labels[v] ?? '') : formatNumber(v)),
      },
      ...series.map((s, position): uPlot.Series => {
        const color = themeColor(`--chart-${s.slot + 1}`)
        const common = {
          label: s.name,
          stroke: color,
          value: (_u: uPlot, v: number | null) => (v === null ? '–' : formatNumber(v)),
        }
        if (kind === 'bar')
          return {
            ...common,
            fill: color,
            width: 0,
            paths: groupedBars(position, series.length),
            points: { show: false },
          }
        if (kind === 'scatter') {
          return {
            ...common,
            paths: () => null,
            points: { show: true, size: 7, fill: color, stroke: SURFACE, width: 1 },
          }
        }
        return { ...common, width: 2, points: { show: xs.length <= 50 } }
      }),
    ],
  }
  return { options, aligned }
}
