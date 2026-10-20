import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartLineIcon, DownloadIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type uPlot from 'uplot'
import {
  AXIS_TYPE_LABELS,
  buildPlotData,
  guessAxisType,
  ROW_NUMBER,
  type AxisType,
} from '@shared/format/plotData'
import { ChoiceSelect, type Choice } from '@/components/ChoiceSelect'
import { EmptyNote } from '@/components/EmptyNote'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsDark } from '@/lib/hooks/useIsDark'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { usePlotSourcesStore, type PlotSource } from '@/store/plotSources'
import { useTabsStore } from '@/store/tabs'
import { useUiStore } from '@/store/ui'
import { assignSlots, MAX_BARS, MAX_SERIES, toggleY } from './plotChoices'
import { buildPlot, type ChartKind } from './plotOptions'
import { UPlotChart } from './UPlotChart'
import { usePlotRows } from './usePlotRows'

const ROW_NUMBER_NAME = 'Row #'
const KINDS: Record<ChartKind, string> = { line: 'Line', scatter: 'Scatter', bar: 'Bar' }

/** Plots the grid of the active tab (port of ui/plot_dock.py). */
export function PlotPanel() {
  const activeId = useTabsStore((s) => s.activeId)
  const source = usePlotSourcesStore((s) => (activeId ? (s.sources[activeId] ?? null) : null))
  return <PlotView key={activeId ?? ''} source={source} />
}

function PlotView({ source }: { source: PlotSource | null }) {
  const [kind, setKind] = useState<ChartKind>('line')
  const [xName, setXName] = useState(ROW_NUMBER_NAME)
  const [checked, setChecked] = useState<string[]>([])
  const [slots, setSlots] = useState<Record<string, number>>({})
  const [loadAll, setLoadAll] = useState(false)
  const chart = useRef<uPlot | null>(null)
  const isDark = useIsDark()
  const { rows, total, loading, error } = usePlotRows(source, loadAll)
  const columns = useMemo(() => source?.columns ?? [], [source])

  const types = useMemo<(AxisType | null)[]>(
    () => columns.map((_, i) => guessAxisType(rows.map((r) => r[i]))),
    [columns, rows],
  )
  // A column that isn't there any more counts as "Row #" (ROW_NUMBER is -1, like indexOf's miss).
  const xIndex = xName === ROW_NUMBER_NAME ? ROW_NUMBER : columns.indexOf(xName)
  const yNames = useMemo(
    () => checked.filter((n) => types[columns.indexOf(n)] === 'numeric'),
    [checked, types, columns],
  )

  const plot = useMemo(() => {
    if (!yNames.length) return null
    const ys = yNames.map((n) => columns.indexOf(n))
    const data = buildPlotData(rows, xIndex, ys, xIndex === ROW_NUMBER ? 'numeric' : types[xIndex])
    if (!data.xs.length) return { data, built: null }
    const series = yNames.map((name, i) => ({ index: ys[i]!, name, slot: slots[name] ?? 0 }))
    return { data, built: buildPlot(data, series, kind, xName) }
  }, [yNames, xIndex, columns, rows, types, kind, xName, slots])

  // Colours are read from the theme when drawing.
  useEffect(() => {
    chart.current?.redraw(false, true)
  }, [isDark])

  const toggle = (name: string): void => {
    const next = toggleY(checked, name)
    setChecked(next)
    setSlots(assignSlots(slots, next))
  }

  const saveImage = async (): Promise<void> => {
    const canvas = chart.current?.ctx.canvas
    if (!canvas) return
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const path = await api.files.saveBinary({
        title: 'Save plot',
        defaultName: 'plot.png',
        data: new Uint8Array(await blob.arrayBuffer()),
      })
      if (path) toast.success('Plot saved')
    } catch (err) {
      toast.error(`Couldn't save the plot: ${errorMessage(err)}`)
    }
  }

  const xChoices: Choice<string>[] = [ROW_NUMBER_NAME, ...columns].map((c) => ({ label: c, value: c }))
  const plotted = plot?.data.xs.length ?? 0
  const statusParts = [
    plotted
      ? `${plotted.toLocaleString()} of ${rows.length.toLocaleString()} rows plotted`
      : `${rows.length.toLocaleString()} rows read`,
    rows.length < total ? `${total.toLocaleString()} in total` : '',
    kind === 'bar' && plotted > MAX_BARS ? `bars show the first ${MAX_BARS}` : '',
  ]
  const status = source ? statusParts.filter(Boolean).join(' · ') : ''
  const hint = !source
    ? 'Open a table or run a query to plot its data.'
    : error ||
      (!yNames.length
        ? 'Choose one or more numeric columns for the Y axis.'
        : !plotted
          ? 'The X column has no values that can be plotted.'
          : '')

  return (
    <aside aria-label="Plot" className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <ChartLineIcon className="size-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-medium">{source ? `Plot · ${source.name}` : 'Plot'}</h2>
        <TooltipIconButton label="Close the plot" onClick={() => useUiStore.getState().togglePlot()}>
          <XIcon />
        </TooltipIconButton>
      </header>
      <div className="flex flex-col gap-3 border-b p-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as ChartKind)}>
          <TabsList aria-label="Chart type" className="w-full">
            {(Object.keys(KINDS) as ChartKind[]).map((k) => (
              <TabsTrigger key={k} value={k}>
                {KINDS[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ChoiceSelect
          label="X axis"
          size="sm"
          className="w-full"
          value={xName}
          choices={xChoices}
          onChange={setXName}
        />
        <ul aria-label="Y axis" className="flex max-h-48 flex-col gap-1 overflow-y-auto p-1">
          {columns.map((name, i) => {
            const type = types[i]
            const numeric = type === 'numeric'
            const on = checked.includes(name) && numeric
            const slot = slots[name]
            return (
              <li key={name}>
                <Label
                  className="gap-2 font-normal data-[disabled=true]:opacity-50"
                  data-disabled={!numeric || (!on && checked.length >= MAX_SERIES)}
                  title={
                    numeric
                      ? undefined
                      : `${type ? AXIS_TYPE_LABELS[type] : 'No data'}: only numeric columns can be plotted`
                  }
                >
                  <Checkbox
                    checked={on}
                    disabled={!numeric || (!on && checked.length >= MAX_SERIES)}
                    onCheckedChange={() => toggle(name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  {on && slot !== undefined && (
                    <span
                      aria-hidden
                      className="size-3 rounded-full"
                      style={{ backgroundColor: `var(--chart-${slot + 1})` }}
                    />
                  )}
                </Label>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="xs"
            disabled={!source || loadAll || rows.length >= total}
            onClick={() => setLoadAll(true)}
          >
            Load all data
          </Button>
          <span className="ml-auto" />
          <TooltipIconButton
            label="Reset zoom"
            disabled={!plot?.built}
            onClick={() => {
              const u = chart.current
              if (u) u.setData(u.data, true)
            }}
          >
            <RotateCcwIcon />
          </TooltipIconButton>
          <TooltipIconButton label="Save as image" disabled={!plot?.built} onClick={() => void saveImage()}>
            <DownloadIcon />
          </TooltipIconButton>
        </div>
        <p className="text-micro text-muted-foreground tabular-nums" aria-live="polite">
          {loading ? 'Reading rows…' : status}
        </p>
      </div>
      <div className="min-h-0 flex-1 p-2">
        {plot?.built ? (
          <UPlotChart
            options={plot.built.options}
            data={plot.built.aligned}
            chartRef={chart}
            label={`${KINDS[kind]} chart of ${yNames.join(', ')} by ${xName}`}
          />
        ) : (
          <EmptyNote>{hint}</EmptyNote>
        )}
      </div>
    </aside>
  )
}
