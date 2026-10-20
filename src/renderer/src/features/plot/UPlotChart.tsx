import { useEffect, useRef, type Ref } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

const LEGEND_HEIGHT = 32

interface UPlotChartProps {
  options: Omit<uPlot.Options, 'width' | 'height'>
  data: uPlot.AlignedData
  /** Receives the chart (for reset zoom and saving), or null when it goes. */
  chartRef?: Ref<uPlot | null>
  label: string
}

function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

/** A uPlot chart that fills its container and follows its size; rebuilt when options or data change. */
export function UPlotChart({ options, data, chartRef, label }: UPlotChartProps) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const legend = options.legend?.show === false ? 0 : LEGEND_HEIGHT
    const size = (): { width: number; height: number } => ({
      width: Math.max(100, el.clientWidth),
      height: Math.max(80, el.clientHeight - legend),
    })
    const u = new uPlot({ ...options, ...size() }, data, el)
    assignRef(chartRef, u)
    const observer = new ResizeObserver(() => u.setSize(size()))
    observer.observe(el)
    return () => {
      observer.disconnect()
      u.destroy()
      assignRef(chartRef, null)
    }
  }, [options, data, chartRef])

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className="plot-chart h-full min-h-0 w-full overflow-hidden"
    />
  )
}
