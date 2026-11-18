import { describe, expect, it } from 'vitest'
import {
  DATASETS,
  DATASET_IDS,
  EMPLOYED_THOUSANDS,
  CHILD_LOW_INCOME_RATE,
  YOUTH_UNEMPLOYMENT_MAX_2010_2019,
  ORPO_START,
  governmentAt,
  periodDate,
  periodMean,
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
  it('employed people: about +110 000 in the previous term, about −47 000 under Orpo', () => {
    expect(EMPLOYED_THOUSANDS['2023M06'] - EMPLOYED_THOUSANDS['2019M06']).toBe(110)
    expect(EMPLOYED_THOUSANDS['2026M09'] - EMPLOYED_THOUSANDS['2023M06']).toBe(-47)
  })

  it('employment rate: back to where it was when the previous government started', () => {
    const obs = DATASETS.tyollisyys.observations
    expect(valueAt(obs, '2019M06')).toBe(75.8)
    expect(Math.max(...obs.map((o) => o.value))).toBe(78.5)
    expect(valueAt(obs, '2026M09')).toBe(75.8)
  })

  it('unemployment rate: 7.2 % → 10.5 % under Orpo', () => {
    const obs = DATASETS.tyottomyys.observations
    expect(valueAt(obs, '2023M06')).toBe(7.2)
    expect(valueAt(obs, '2026M09')).toBe(10.5)
  })

  it('youth unemployment: 16.4 % → 23.5 % under Orpo, the highest since the series began in 2010', () => {
    const obs = DATASETS.nuorisotyottomyys.observations
    expect(valueAt(obs, '2023M06')).toBe(16.4)
    expect(valueAt(obs, '2026M09')).toBe(23.5)
    expect(Math.max(...obs.map((o) => o.value))).toBe(23.5)
    expect(23.5).toBeGreaterThan(YOUTH_UNEMPLOYMENT_MAX_2010_2019)
  })

  it('debt ratio: 74.8 % → 90.3 % under Orpo, about twice the previous term (+7.6 pp)', () => {
    const obs = DATASETS['julkinen-velka'].observations
    expect(valueAt(obs, '2019Q2')).toBe(67.2)
    expect(valueAt(obs, '2023Q2')).toBe(74.8)
    expect(valueAt(obs, '2026Q2')).toBe(90.3)
    expect((90.3 - 74.8) / (74.8 - 67.2)).toBeCloseTo(2, 0)
  })

  it('bankruptcies: about 212 a month before, about 312 under Orpo', () => {
    const data = DATASETS.konkurssit
    expect(Math.round(periodMean(data, '2019M06', '2023M05'))).toBe(212)
    expect(Math.round(periodMean(data, '2023M07'))).toBe(312)
  })

  it('children in low-income families: up about 14 000 in 2024, rate at a series high', () => {
    const obs = DATASETS.lapsikoyhyys.observations
    expect(Math.round((valueAt(obs, '2024') - valueAt(obs, '2023')) / 1000)).toBe(14)
    const rates = Object.values(CHILD_LOW_INCOME_RATE)
    expect(CHILD_LOW_INCOME_RATE[2024]).toBe(13.8)
    expect(Math.max(...rates)).toBe(13.8)
    expect(rates.filter((r) => r === 13.8)).toHaveLength(1)
  })

  it('homelessness: down about a quarter, then back almost to 2019', () => {
    const obs = DATASETS.asunnottomuus.observations
    expect(pct(valueAt(obs, '2019'), valueAt(obs, '2023'))).toBe(-25)
    expect(valueAt(obs, '2025') / valueAt(obs, '2019')).toBeGreaterThan(0.99)
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
  it('places months mid-month, quarters at quarter end and years mid-year', () => {
    expect(periodDate('2023M06').toISOString().slice(0, 10)).toBe('2023-06-15')
    expect(periodDate('2023Q2').toISOString().slice(0, 10)).toBe('2023-06-30')
    expect(periodDate('2023').toISOString().slice(0, 10)).toBe('2023-07-01')
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

// No published chart uses bars any more; the bar layout stays supported,
// exercised through this fixture.
const BAR_FIXTURE = {
  ...DATASETS.asunnottomuus,
  kind: 'bar' as const,
  yMin: 0,
  yMax: 5000,
  yStep: 1000,
}

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
      })
    }
  }

  it('draws "worse" as down in every chart', () => {
    // Homelessness, debt and bankruptcies rose under Orpo; consumer
    // confidence is already "higher is better". The latest point must sit
    // below the handover point in all four.
    const handover = {
      asunnottomuus: '2023',
      'julkinen-velka': '2023Q2',
      konkurssit: '2023M06',
      tyottomyys: '2023M06',
      nuorisotyottomyys: '2023M06',
      tyollisyys: '2023M06',
      lapsikoyhyys: '2023',
    }
    for (const [id, period] of Object.entries(handover)) {
      const layout = layoutChart(DATASETS[id as keyof typeof handover], WIDE, 'fi')
      const at = layout.points.find((p) => p.period === period)!
      expect(layout.points.at(-1)!.y).toBeGreaterThan(at.y)
    }
    expect(DATASETS['kuluttajien-luottamus'].invert).toBeFalsy()
  })

  it('splits the 2023 bar between the two governments', () => {
    const layout = layoutChart(BAR_FIXTURE, WIDE, 'fi')
    const bar2023 = layout.bars.find((b) => b.period === '2023')!
    expect(bar2023.parts.map((p) => p.government)).toEqual(['rinneMarin', 'orpo'])
  })

  it('refuses a bar chart whose axis does not start at zero', () => {
    expect(() => layoutChart({ ...BAR_FIXTURE, yMin: 3000 }, WIDE, 'fi')).toThrow(/zero/)
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
