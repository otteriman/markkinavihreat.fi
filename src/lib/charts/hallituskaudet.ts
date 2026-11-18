/**
 * Data for the "government term" charts: one statistic each, plotted across
 * the Rinne–Marin governments (2019–2023) and the Orpo government (2023–),
 * with the background split at the day the Orpo government took office.
 *
 * This module is the single source for those numbers — the blog post's body
 * copy quotes figures derived from it (see tests/unit/charts.hallituskaudet.test.ts,
 * which pins them), so the text and the charts can't drift apart.
 *
 * Observations are the raw published values. Where a dataset sets
 * `movingAverage`, the chart plots a trailing average over that many periods
 * and only from the first period with a full window — the leading
 * observations exist to feed that first window, not to be plotted on their own.
 *
 * The three Tilastokeskus series were checked against its PxWeb tables
 * (kony/13fb, kbar/11cc, jyev/12sy) on 18 November 2026; the debt series
 * reflects the revision published on 25 September 2026.
 */

export type DatasetId = 'asunnottomuus' | 'julkinen-velka' | 'konkurssit' | 'kuluttajien-luottamus'

export type Frequency = 'year' | 'quarter' | 'month'

export interface Observation {
  /** Tilastokeskus-style period: "2023", "2023Q2" or "2023M06". */
  period: string
  value: number
}

export interface Dataset {
  id: DatasetId
  /** `bar` for a handful of annual counts, `line` for a long monthly/quarterly series. */
  kind: 'bar' | 'line'
  frequency: Frequency
  /** `percent` values are in percent (74.7 means 74.7 %), not fractions. */
  format: 'count' | 'percent' | 'balance'
  /** Decimals shown in labels, tooltips and the table. */
  decimals: number
  movingAverage?: number
  /** Explicit y-axis range; left out, a "nice" range around the data is derived. */
  yMin?: number
  yMax?: number
  yStep?: number
  sourceUrl: string
  observations: Observation[]
}

/** The Rinne government was appointed on 6 June 2019; the Marin government continued it from 10 December 2019. */
export const RINNE_MARIN_START = new Date(Date.UTC(2019, 5, 6))
/** The Orpo government was appointed on 20 June 2023. */
export const ORPO_START = new Date(Date.UTC(2023, 5, 20))

export type Government = 'rinneMarin' | 'orpo'

export function governmentAt(date: Date): Government {
  return date.getTime() < ORPO_START.getTime() ? 'rinneMarin' : 'orpo'
}

const PERIOD = /^(\d{4})(?:Q([1-4])|M(0[1-9]|1[0-2]))?$/

/**
 * The instant a period's value is plotted at. Months sit mid-month (a flow over
 * the month). Quarters sit at the quarter's end, because the only quarterly
 * series here is a stock — debt on the last day of the quarter. Years start on
 * 1 January; the bar chart lays years out as bands and doesn't use this.
 */
export function periodDate(period: string): Date {
  const match = period.match(PERIOD)
  if (!match) throw new Error(`Unrecognised period "${period}"`)
  const [, year, quarter, month] = match
  const y = Number(year)
  if (quarter) return new Date(Date.UTC(y, Number(quarter) * 3, 0))
  if (month) return new Date(Date.UTC(y, Number(month) - 1, 15))
  return new Date(Date.UTC(y, 0, 1))
}

/** Share of `year` that had passed when `date` arrived (0 at 1 January, ~1 at 31 December). */
export function yearFraction(date: Date): number {
  const y = date.getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return (date.getTime() - start) / (end - start)
}

/**
 * Trailing averages over `window` observations, starting at the first full
 * window — so every plotted point is an average of exactly `window` values.
 */
export function trailingAverage(observations: Observation[], window: number): Observation[] {
  if (window <= 1) return observations
  return observations.slice(window - 1).map((obs, i) => {
    const slice = observations.slice(i, i + window)
    return { period: obs.period, value: slice.reduce((sum, o) => sum + o.value, 0) / window }
  })
}

/** What the chart plots: the raw observations, or their trailing average. */
export function plottedSeries(dataset: Dataset): Observation[] {
  return dataset.movingAverage
    ? trailingAverage(dataset.observations, dataset.movingAverage)
    : dataset.observations
}

/** Mean of the raw observations whose period falls within [from, to] (inclusive, by period string). */
export function periodMean(dataset: Dataset, from: string, to?: string): number {
  const values = dataset.observations
    .filter((o) => o.period >= from && (to === undefined || o.period <= to))
    .map((o) => o.value)
  if (values.length === 0) throw new Error(`No observations in ${from}–${to ?? 'end'}`)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function valueAt(series: Observation[], period: string): number {
  const obs = series.find((o) => o.period === period)
  if (!obs) throw new Error(`No observation for period "${period}"`)
  return obs.value
}

const monthly = (start: string, values: number[]): Observation[] => {
  const [year, month] = [Number(start.slice(0, 4)), Number(start.slice(5, 7))]
  return values.map((value, i) => {
    const index = month - 1 + i
    const y = year + Math.floor(index / 12)
    const m = (index % 12) + 1
    return { period: `${y}M${String(m).padStart(2, '0')}`, value }
  })
}

const quarterly = (start: string, values: number[]): Observation[] => {
  const [year, quarter] = [Number(start.slice(0, 4)), Number(start.slice(5, 6))]
  return values.map((value, i) => {
    const index = quarter - 1 + i
    return { period: `${year + Math.floor(index / 4)}Q${(index % 4) + 1}`, value }
  })
}

export const DATASETS: Record<DatasetId, Dataset> = {
  // Ympäristöministeriö, "Asunnottomat 2025": yksinelävät asunnottomat yhteensä.
  asunnottomuus: {
    id: 'asunnottomuus',
    kind: 'bar',
    frequency: 'year',
    format: 'count',
    decimals: 0,
    yMin: 0,
    yMax: 6000,
    yStep: 1000,
    sourceUrl: 'https://julkaisut.valtioneuvosto.fi/items/3e1a9858-cde4-4996-b5a9-50df819fbd27',
    observations: [
      { period: '2019', value: 4600 },
      { period: '2020', value: 4341 },
      { period: '2021', value: 3948 },
      { period: '2022', value: 3686 },
      { period: '2023', value: 3429 },
      { period: '2024', value: 3806 },
      { period: '2025', value: 4579 },
    ],
  },
  // Tilastokeskus: julkisyhteisöjen EDP-velan suhde BKT:hen, neljännesvuosittain.
  'julkinen-velka': {
    id: 'julkinen-velka',
    kind: 'line',
    frequency: 'quarter',
    format: 'percent',
    decimals: 1,
    yMin: 60,
    yMax: 95,
    yStep: 5,
    sourceUrl: 'https://stat.fi/fi/indikaattori/julkinenvelka',
    observations: quarterly(
      '2019Q2',
      [
        67.2, 65.8, 65.3, 70.0, 74.5, 72.7, 75.3, 76.2, 75.2, 74.5, 73.1, 73.0, 73.2, 72.5, 74.1,
        73.7, 74.8, 74.7, 77.2, 78.6, 80.6, 82.2, 82.5, 84.1, 88.2, 86.5, 88.4, 89.6, 90.3,
      ],
    ),
  },
  // Tilastokeskus: vireille pannut konkurssit, yritysten lukumäärä kuukaudessa.
  konkurssit: {
    id: 'konkurssit',
    kind: 'line',
    frequency: 'month',
    format: 'count',
    decimals: 0,
    movingAverage: 6,
    yMin: 100,
    yMax: 400,
    yStep: 100,
    sourceUrl:
      'https://pxdata.stat.fi/PXWeb/pxweb/fi/StatFin/StatFin__kony/statfin_kony_pxt_13fb.px',
    observations: monthly(
      '2019-01',
      [
        // 2019
        249, 208, 222, 231, 216, 224, 202, 188, 235, 254, 230, 164,
        // 2020
        296, 268, 219, 218, 200, 154, 115, 130, 150, 144, 151, 90,
        // 2021
        131, 284, 287, 188, 247, 183, 135, 168, 193, 209, 241, 206,
        // 2022
        216, 194, 251, 172, 269, 222, 148, 227, 284, 216, 233, 222,
        // 2023
        307, 324, 260, 267, 243, 239, 224, 283, 310, 269, 345, 244,
        // 2024
        298, 342, 274, 295, 327, 252, 225, 306, 274, 339, 288, 268,
        // 2025
        381, 328, 350, 333, 366, 305, 251, 274, 289, 348, 321, 360,
        // 2026
        385, 379, 391, 357, 320, 332, 243, 296, 344, 364,
      ],
    ),
  },
  // Tilastokeskus: kuluttajien luottamusindikaattori (A1), saldoluku.
  'kuluttajien-luottamus': {
    id: 'kuluttajien-luottamus',
    kind: 'line',
    frequency: 'month',
    format: 'balance',
    decimals: 1,
    movingAverage: 6,
    yMin: -20,
    yMax: 10,
    yStep: 5,
    sourceUrl:
      'https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__kbar/statfin_kbar_pxt_11cc.px',
    observations: monthly(
      '2019-01',
      [
        // 2019
        -2.4, -2.4, -2.3, -1.7, -1.8, -4.6, -3.9, -4.5, -4.2, -6.6, -5.0, -4.2,
        // 2020
        -4.6, -4.5, -7.1, -13.9, -9.0, -3.9, -1.6, -5.1, -5.9, -6.9, -4.8, -4.6,
        // 2021
        -0.9, -0.8, -3.0, 3.8, 2.7, 4.6, 4.4, 4.0, 6.0, 2.7, 1.2, -3.5,
        // 2022
        -1.7, 0.5, -10.5, -11.7, -11.6, -14.3, -15.9, -14.9, -18.3, -17.6, -16.9, -18.5,
        // 2023
        -12.7, -11.9, -10.8, -7.9, -8.8, -8.8, -8.8, -8.0, -11.5, -12.6, -12.4, -13.3,
        // 2024
        -9.1, -9.5, -9.4, -12.6, -10.3, -7.6, -7.2, -7.2, -8.1, -6.8, -7.4, -8.6,
        // 2025
        -8.4, -9.0, -8.2, -7.4, -8.4, -8.6, -6.4, -7.6, -6.6, -7.6, -6.5, -7.3,
        // 2026
        -8.7, -10.5, -11.5, -12.5, -10.5, -5.3, -5.3, -3.0, -4.9, -9.7,
      ],
    ),
  },
}

export const DATASET_IDS = Object.keys(DATASETS) as DatasetId[]
