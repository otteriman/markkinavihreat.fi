import { describe, expect, it } from 'vitest'
import {
  DATASETS,
  DATASET_IDS,
  ORPO_START,
  governmentAt,
  periodDate,
  periodMean,
  plottedSeries,
  trailingAverage,
  valueAt,
} from '../../src/lib/charts/hallituskaudet'
import {
  COMPACT,
  WIDE,
  barPath,
  layoutChart,
  niceStep,
  splitLine,
} from '../../src/lib/charts/hallituskausiLayout'
import { formatChartValue, formatPeriod } from '../../src/lib/format'

const pct = (from: number, to: number) => Math.round(((to - from) / from) * 100)

// The figures quoted in the body copy of
// src/content/blog/orpon-hallitus-on-epaonnistunut.*.md. If the data changes,
// these fail — update the post's text along with them.
describe('figures quoted in "Orpon hallitus on epäonnistunut"', () => {
  it('homelessness: down about a quarter, then up about a third', () => {
    const obs = DATASETS.asunnottomuus.observations
    expect(valueAt(obs, '2019')).toBe(4600)
    expect(valueAt(obs, '2023')).toBe(3429)
    expect(valueAt(obs, '2025')).toBe(4579)
    expect(pct(4600, 3429)).toBe(-25)
    expect(pct(3429, 4579)).toBe(34)
  })

  it('debt ratio: +7.6 pp in the previous term, +15.5 pp (about twice that) under Orpo', () => {
    const obs = DATASETS['julkinen-velka'].observations
    expect(valueAt(obs, '2019Q2')).toBe(67.2)
    expect(valueAt(obs, '2023Q2')).toBe(74.8)
    expect(valueAt(obs, '2026Q2')).toBe(90.3)
    expect(74.8 - 67.2).toBeCloseTo(7.6, 5)
    expect(90.3 - 74.8).toBeCloseTo(15.5, 5)
    expect((90.3 - 74.8) / (74.8 - 67.2)).toBeCloseTo(2, 0)
    // "risen every year": each year-end above the previous one, from the handover on.
    const ends = ['2023Q2', '2023Q4', '2024Q4', '2025Q4', '2026Q2'].map((p) => valueAt(obs, p))
    ends.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(ends[i]))
  })

  it('bankruptcies: about 212 a month before, about 312 under Orpo', () => {
    const data = DATASETS.konkurssit
    expect(Math.round(periodMean(data, '2019M06', '2023M05'))).toBe(212)
    expect(Math.round(periodMean(data, '2023M07'))).toBe(312)
    expect(Math.round(periodMean(data, '2019M06', '2019M12'))).toBe(214)
    const total = (year: string) =>
      data.observations.filter((o) => o.period.startsWith(year)).reduce((s, o) => s + o.value, 0)
    expect(total('2025')).toBe(3906)
    expect(total('2026')).toBe(3411)
  })

  it('consumer confidence: −2.7 before 2022, −8.6 under Orpo, latest average −6.5', () => {
    const data = DATASETS['kuluttajien-luottamus']
    expect(periodMean(data, '2019M06', '2021M12')).toBeCloseTo(-2.7, 1)
    expect(periodMean(data, '2023M07')).toBeCloseTo(-8.6, 1)
    // Shown as −6,5 in the chart's end label, so the text says −6,5 too.
    expect(formatChartValue(valueAt(plottedSeries(data), '2026M10'), 'balance', 1, 'fi')).toBe(
      '−6,5',
    )
  })
})

describe('trailingAverage', () => {
  it('starts at the first full window and averages exactly that many values', () => {
    const obs = [1, 2, 3, 4, 5].map((value, i) => ({ period: `2020M0${i + 1}`, value }))
    expect(trailingAverage(obs, 3)).toEqual([
      { period: '2020M03', value: 2 },
      { period: '2020M04', value: 3 },
      { period: '2020M05', value: 4 },
    ])
  })
})

describe('periodDate / governmentAt', () => {
  it('places months mid-month and quarters at quarter end', () => {
    expect(periodDate('2023M06').toISOString().slice(0, 10)).toBe('2023-06-15')
    expect(periodDate('2023Q2').toISOString().slice(0, 10)).toBe('2023-06-30')
    expect(periodDate('2023').toISOString().slice(0, 10)).toBe('2023-01-01')
  })

  it('switches government on 20 June 2023', () => {
    expect(ORPO_START.toISOString().slice(0, 10)).toBe('2023-06-20')
    expect(governmentAt(periodDate('2023M06'))).toBe('rinneMarin')
    expect(governmentAt(periodDate('2023Q2'))).toBe('orpo')
  })
})

describe('layout helpers', () => {
  it('splits a line at the boundary with the crossing in both halves', () => {
    const { before, after } = splitLine(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      15,
    )
    expect(before.at(-1)).toEqual({ x: 15, y: 15 })
    expect(after[0]).toEqual({ x: 15, y: 15 })
    expect(before).toHaveLength(3)
    expect(after).toHaveLength(2)
  })

  it('rounds only the data-end of a bar', () => {
    expect(barPath(0, 24, 100, 10, 4, 4)).toBe('M0,100 V14 Q0,10 4,10 H20 Q24,10 24,14 V100 Z')
  })

  it('rounds the bottom end of a bar that grows down an inverted axis', () => {
    expect(barPath(0, 24, 10, 100, 4, 4)).toBe('M0,10 V96 Q0,100 4,100 H20 Q24,100 24,96 V10 Z')
  })

  it('picks nice steps', () => {
    expect(niceStep(30)).toBe(10)
    expect(niceStep(5000)).toBe(1000)
    expect(niceStep(4)).toBe(1)
  })
})

describe('layoutChart', () => {
  for (const id of DATASET_IDS) {
    for (const [name, size] of [
      ['wide', WIDE],
      ['compact', COMPACT],
    ] as const) {
      it(`lays out "${id}" (${name}) inside its plot`, () => {
        const layout = layoutChart(DATASETS[id], size, 'fi')
        const { plot } = layout
        expect(layout.boundaryX).toBeGreaterThan(plot.left)
        expect(layout.boundaryX).toBeLessThan(plot.right)
        for (const p of layout.points) {
          expect(p.x).toBeGreaterThanOrEqual(plot.left)
          expect(p.x).toBeLessThanOrEqual(plot.right)
          expect(p.y).toBeGreaterThanOrEqual(plot.top)
          expect(p.y).toBeLessThanOrEqual(plot.bottom)
        }
        // Direct labels: start, handover and latest — never one per point.
        expect(layout.annotations.length).toBeLessThanOrEqual(3)
        for (const a of layout.annotations)
          expect(a.labelY - size.fontSize).toBeGreaterThanOrEqual(plot.top - 1)
      })
    }
  }

  it('keeps every bar value label past its bar end (below, on the inverted axis), never inside it', () => {
    for (const size of [WIDE, COMPACT]) {
      const layout = layoutChart(DATASETS.asunnottomuus, size, 'fi')
      for (const a of layout.annotations) {
        expect(a.labelY - size.fontSize).toBeGreaterThan(a.y)
        expect(a.labelY).toBeLessThanOrEqual(layout.plot.bottom)
      }
    }
  })

  it('draws "worse" as down in every chart', () => {
    // Homelessness, debt and bankruptcies rose under Orpo; consumer
    // confidence is already "higher is better". The latest point must sit
    // below the handover point in all four.
    const handover = { asunnottomuus: '2023', 'julkinen-velka': '2023Q2', konkurssit: '2023M06' }
    for (const [id, period] of Object.entries(handover)) {
      const layout = layoutChart(DATASETS[id as keyof typeof handover], WIDE, 'fi')
      const at = layout.points.find((p) => p.period === period)!
      expect(layout.points.at(-1)!.y).toBeGreaterThan(at.y)
    }
    expect(DATASETS['kuluttajien-luottamus'].invert).toBeFalsy()
  })

  it('splits the 2023 bar between the two governments', () => {
    const layout = layoutChart(DATASETS.asunnottomuus, WIDE, 'fi')
    const bar2023 = layout.bars.find((b) => b.period === '2023')!
    expect(bar2023.parts.map((p) => p.government)).toEqual(['rinneMarin', 'orpo'])
  })

  it('refuses a bar chart whose axis does not start at zero', () => {
    expect(() => layoutChart({ ...DATASETS.asunnottomuus, yMin: 3000 }, WIDE, 'fi')).toThrow(/zero/)
  })

  it('refuses an axis that would clip the data', () => {
    expect(() => layoutChart({ ...DATASETS['julkinen-velka'], yMax: 90 }, WIDE, 'fi')).toThrow(
      /outside/,
    )
  })
})

describe('chart formatting', () => {
  it('formats values per locale', () => {
    expect(formatChartValue(74.7, 'percent', 1, 'fi')).toBe('74,7 %')
    expect(formatChartValue(74.7, 'percent', 1, 'en')).toBe('74.7%')
    expect(formatChartValue(-4.8, 'balance', 1, 'fi')).toBe('−4,8')
    expect(formatChartValue(4.3, 'balance', 1, 'en')).toBe('+4.3')
    expect(formatChartValue(4600, 'count', 0, 'en')).toBe('4,600')
  })

  it('formats periods per locale', () => {
    expect(formatPeriod('2023M06', 'fi')).toBe('kesäkuu 2023')
    expect(formatPeriod('2023Q2', 'fi')).toBe('2. neljännes 2023')
    expect(formatPeriod('2023Q2', 'en')).toBe('Q2 2023')
    expect(formatPeriod('2023', 'sv')).toBe('2023')
  })
})
