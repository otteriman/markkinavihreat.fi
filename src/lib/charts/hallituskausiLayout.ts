/**
 * Geometry for the government-term charts (see ./hallituskaudet.ts), in SVG
 * user units. Kept out of the .astro component so it can be unit tested, and
 * computed once per layout size — the component renders a wide layout for
 * tablets and up and a compact one for phones, because a single viewBox
 * scaled down to a phone shrinks the axis text below legibility.
 */
import type { Locale } from '../content'
import { formatChartValue, formatPeriod } from '../format'
import {
  ORPO_START,
  governmentAt,
  periodDate,
  plottedSeries,
  yearFraction,
  type Dataset,
  type Government,
} from './hallituskaudet'

export interface ChartSize {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  /** Height of the band above the plot that holds the two government labels. */
  stripHeight: number
  fontSize: number
}

export const WIDE: ChartSize = {
  width: 720,
  height: 480,
  margin: { top: 4, right: 12, bottom: 30, left: 56 },
  stripHeight: 30,
  fontSize: 13,
}

export const COMPACT: ChartSize = {
  width: 400,
  height: 420,
  margin: { top: 4, right: 8, bottom: 28, left: 48 },
  stripHeight: 28,
  fontSize: 12,
}

/** Mark specs: bars at most 44 px wide with a 4 px rounded data-end; 5 px dot radius. */
const MAX_BAR_WIDTH = 44
const BAR_RADIUS = 4
const DOT_RADIUS = 5
/** Stroke width of the data line, in px (non-scaling, so the same on every screen). */
export const LINE_WIDTH = 3.5

export interface ChartPoint {
  period: string
  x: number
  y: number
  government: Government | 'split'
  valueLabel: string
  periodLabel: string
}

export interface Annotation {
  x: number
  y: number
  labelX: number
  labelY: number
  anchor: 'start' | 'middle' | 'end'
  text: string
  government: Government
  /** Bars carry their label on the cap and draw no dot. */
  dot: boolean
}

export interface BarShape {
  period: string
  parts: Array<{ government: Government; d: string }>
}

export interface ChartLayout {
  width: number
  height: number
  plot: { left: number; right: number; top: number; bottom: number }
  boundaryX: number
  regions: Array<{ government: Government; x: number; width: number; labelX: number }>
  regionTop: number
  regionLabelY: number
  yTicks: Array<{ y: number; label: string; isZero: boolean }>
  xTicks: number[]
  xLabels: Array<{ x: number; label: string }>
  lines: Array<{ government: Government; d: string }>
  bars: BarShape[]
  points: ChartPoint[]
  annotations: Annotation[]
  dotRadius: number
}

const round = (n: number) => Math.round(n * 100) / 100

function linear(d0: number, d1: number, r0: number, r1: number) {
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)
}

/** A "nice" step (1, 2, 2.5 or 5 × 10^k) giving roughly `target` intervals over `span`. */
export function niceStep(span: number, target = 5): number {
  const raw = span / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw)!
  return step * magnitude
}

export function yDomain(dataset: Dataset, values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const floor = dataset.kind === 'bar' ? 0 : min
  const step = dataset.yStep ?? niceStep(max - floor)
  const yMin = dataset.yMin ?? (dataset.kind === 'bar' ? 0 : Math.floor(min / step) * step)
  const yMax = dataset.yMax ?? Math.ceil(max / step) * step
  if (dataset.kind === 'bar' && yMin !== 0) {
    // A bar's length is its value: a baseline above zero would exaggerate every difference.
    throw new Error(`Bar chart "${dataset.id}" must start its y-axis at zero`)
  }
  if (min < yMin || max > yMax) {
    throw new Error(
      `Chart "${dataset.id}" data (${min}–${max}) falls outside its y-axis (${yMin}–${yMax})`,
    )
  }
  return { yMin, yMax, step }
}

/**
 * A bar from `baseY` (the zero line) to `endY` (the value), rounded only at
 * the data-end and square at the baseline. Grows up when `endY` is above
 * `baseY`, and down on an inverted axis.
 */
export function barPath(
  x: number,
  width: number,
  baseY: number,
  endY: number,
  radiusLeft: number,
  radiusRight: number,
): string {
  const dir = endY < baseY ? -1 : 1
  const height = Math.abs(endY - baseY)
  const rl = Math.min(radiusLeft, height, width)
  const rr = Math.min(radiusRight, height, width)
  return [
    `M${round(x)},${round(baseY)}`,
    `V${round(endY - dir * rl)}`,
    `Q${round(x)},${round(endY)} ${round(x + rl)},${round(endY)}`,
    `H${round(x + width - rr)}`,
    `Q${round(x + width)},${round(endY)} ${round(x + width)},${round(endY - dir * rr)}`,
    `V${round(baseY)}`,
    'Z',
  ].join(' ')
}

/**
 * Splits a polyline at `boundaryX`, inserting the interpolated crossing point
 * into both halves, so each government's stretch is its own path and the
 * colour changes exactly on the day the government changed.
 */
export function splitLine(
  points: Array<{ x: number; y: number }>,
  boundaryX: number,
): { before: Array<{ x: number; y: number }>; after: Array<{ x: number; y: number }> } {
  const before = points.filter((p) => p.x <= boundaryX)
  const after = points.filter((p) => p.x >= boundaryX)
  const last = before[before.length - 1]
  const first = after[0]
  if (last && first && last.x !== boundaryX && first.x !== boundaryX) {
    const t = (boundaryX - last.x) / (first.x - last.x)
    const crossing = { x: boundaryX, y: last.y + t * (first.y - last.y) }
    before.push(crossing)
    after.unshift(crossing)
  }
  return { before, after }
}

const toPath = (points: Array<{ x: number; y: number }>) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join(' ')

function nearestIndex(xs: number[], x: number): number {
  return xs.reduce((best, cur, i) => (Math.abs(cur - x) < Math.abs(xs[best] - x) ? i : best), 0)
}

export function layoutChart(dataset: Dataset, size: ChartSize, locale: Locale): ChartLayout {
  const series = plottedSeries(dataset)
  const plot = {
    left: size.margin.left,
    right: size.width - size.margin.right,
    top: size.margin.top + size.stripHeight,
    bottom: size.height - size.margin.bottom,
  }
  const { yMin, yMax, step } = yDomain(
    dataset,
    series.map((o) => o.value),
  )
  // An inverted axis runs downward, so that for every chart "down" means
  // "worse": a rise in debt or bankruptcies is drawn as a fall.
  const y = dataset.invert
    ? linear(yMin, yMax, plot.top, plot.bottom)
    : linear(yMin, yMax, plot.bottom, plot.top)

  const yTicks: ChartLayout['yTicks'] = []
  for (let v = yMin; v <= yMax + step / 1000; v += step) {
    const value = round(v)
    yTicks.push({
      y: round(y(value)),
      label: formatChartValue(value, dataset.format, 0, locale),
      isZero: value === 0 && value !== yMin,
    })
  }

  const valueLabel = (v: number) => formatChartValue(v, dataset.format, dataset.decimals, locale)

  let boundaryX: number
  let points: ChartPoint[]
  let lines: ChartLayout['lines'] = []
  let bars: BarShape[] = []
  let xTicks: number[] = []
  let xLabels: ChartLayout['xLabels'] = []

  if (dataset.kind === 'bar') {
    const band = (plot.right - plot.left) / series.length
    const barWidth = Math.min(MAX_BAR_WIDTH, band * 0.62)
    const baseY = y(0)
    const orpoYear = String(ORPO_START.getUTCFullYear())
    const split = yearFraction(ORPO_START)
    boundaryX = plot.left
    points = series.map((obs, i) => {
      const center = plot.left + band * (i + 0.5)
      const left = center - barWidth / 2
      const end = y(obs.value)
      let government: ChartPoint['government']
      if (obs.period === orpoYear) {
        government = 'split'
        const splitX = left + barWidth * split
        boundaryX = splitX
        bars.push({
          period: obs.period,
          parts: [
            {
              government: 'rinneMarin',
              d: barPath(left, splitX - left, baseY, end, BAR_RADIUS, 0),
            },
            {
              government: 'orpo',
              d: barPath(splitX, left + barWidth - splitX, baseY, end, 0, BAR_RADIUS),
            },
          ],
        })
      } else {
        government = obs.period < orpoYear ? 'rinneMarin' : 'orpo'
        bars.push({
          period: obs.period,
          parts: [{ government, d: barPath(left, barWidth, baseY, end, BAR_RADIUS, BAR_RADIUS) }],
        })
      }
      xLabels.push({ x: round(center), label: obs.period })
      return {
        period: obs.period,
        x: round(center),
        y: round(end),
        government,
        valueLabel: valueLabel(obs.value),
        periodLabel: formatPeriod(obs.period, locale),
      }
    })
    if (boundaryX === plot.left) {
      throw new Error(`Bar chart "${dataset.id}" has no bar for ${orpoYear}, the year of the split`)
    }
  } else {
    const dates = series.map((o) => periodDate(o.period).getTime())
    const t0 = dates[0]
    const t1 = dates[dates.length - 1]
    const x = linear(t0, t1, plot.left, plot.right)
    boundaryX = round(x(ORPO_START.getTime()))
    points = series.map((obs, i) => ({
      period: obs.period,
      x: round(x(dates[i])),
      y: round(y(obs.value)),
      government: governmentAt(new Date(dates[i])),
      valueLabel: valueLabel(obs.value),
      periodLabel: formatPeriod(obs.period, locale),
    }))
    const { before, after } = splitLine(points, boundaryX)
    lines = [
      { government: 'rinneMarin' as const, d: toPath(before) },
      { government: 'orpo' as const, d: toPath(after) },
    ].filter((line) => line.d !== '')

    // Ticks on each 1 January; the year's label centred on the part of the
    // year the plot shows, if that's at least 40 % of the year (so a stub of
    // November–December at the start doesn't get a label of its own).
    const firstYear = new Date(t0).getUTCFullYear()
    const lastYear = new Date(t1).getUTCFullYear()
    for (let year = firstYear; year <= lastYear; year++) {
      const start = Date.UTC(year, 0, 1)
      const end = Date.UTC(year + 1, 0, 1)
      if (start > t0) xTicks.push(round(x(start)))
      const visibleStart = Math.max(start, t0)
      const visibleEnd = Math.min(end, t1)
      if ((visibleEnd - visibleStart) / (end - start) >= 0.4) {
        xLabels.push({ x: round(x((visibleStart + visibleEnd) / 2)), label: String(year) })
      }
    }
  }

  // Selective direct labels: where the series starts, where it stood when the
  // government changed, and where it is now. Everything else is in the
  // tooltip and the table.
  const xs = points.map((p) => p.x)
  const annotated = [...new Set([0, nearestIndex(xs, boundaryX), points.length - 1])]
  const lineHeight = size.fontSize + 4
  const annotations: Annotation[] = annotated.map((i) => {
    const point = points[i]
    const isBar = dataset.kind === 'bar'
    const gap = isBar ? 8 : DOT_RADIUS + 8
    // A bar's label sits just past its data-end (below it on an inverted
    // axis). A line's goes on the side of its dot the line doesn't run
    // through — judged from the neighbouring points — and stays in the plot.
    const neighbours = points
      .slice(Math.max(0, i - 3), i + 4)
      .filter((_, j, arr) => arr[j] !== point)
    const lineAbove = neighbours.reduce((sum, p) => sum + p.y, 0) / neighbours.length < point.y
    const fitsAbove = point.y - gap - lineHeight >= plot.top
    const fitsBelow = point.y + gap + size.fontSize <= plot.bottom
    const below = isBar ? Boolean(dataset.invert) : (lineAbove && fitsBelow) || !fitsAbove
    const anchor = isBar ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
    const government: Government =
      point.government === 'split' ? 'orpo' : (point.government as Government)
    return {
      x: point.x,
      y: point.y,
      labelX: point.x,
      labelY: round(below ? point.y + gap + size.fontSize : point.y - gap),
      anchor,
      text: point.valueLabel,
      government,
      dot: !isBar,
    }
  })

  const regionTop = size.margin.top
  const regions: ChartLayout['regions'] = [
    {
      government: 'rinneMarin',
      x: plot.left,
      width: round(boundaryX - plot.left),
      labelX: plot.left + 8,
    },
    {
      government: 'orpo',
      x: boundaryX,
      width: round(plot.right - boundaryX),
      labelX: round(boundaryX + 8),
    },
  ]

  return {
    width: size.width,
    height: size.height,
    plot,
    boundaryX,
    regions,
    regionTop,
    regionLabelY: round(regionTop + size.stripHeight / 2 + size.fontSize / 3),
    yTicks,
    xTicks,
    xLabels,
    lines,
    bars,
    points,
    annotations,
    dotRadius: DOT_RADIUS,
  }
}
