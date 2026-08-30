import { describe, expect, it } from 'vitest'
import {
  deriveVatBreakdown,
  ruokaostostukiBreakdowns,
  subsidyRatio,
} from '../../src/lib/charts/ruokaostostuki'

function round(n: number) {
  return Math.round(n)
}

describe('deriveVatBreakdown', () => {
  it('backs VAT out of a VAT-inclusive figure and derives the general-rate gap (2022 rates)', () => {
    const result = deriveVatBreakdown(2848, 0.14, 0.24)
    expect(round(result.netExpenditure)).toBe(2498)
    expect(round(result.vatPaid)).toBe(350)
    expect(round(result.vatAtGeneralRate)).toBe(600)
    expect(round(result.subsidy)).toBe(250)
  })

  it('matches the high-quintile figures', () => {
    const result = deriveVatBreakdown(5034, 0.14, 0.24)
    expect(round(result.netExpenditure)).toBe(4416)
    expect(round(result.vatPaid)).toBe(618)
    expect(round(result.vatAtGeneralRate)).toBe(1060)
    expect(round(result.subsidy)).toBe(442)
  })
})

describe('ruokaostostukiBreakdowns', () => {
  it('derives both quintiles from the Tilastokeskus 2022 figures at 2022 VAT rates', () => {
    const { low, high } = ruokaostostukiBreakdowns()
    expect(round(low.subsidy)).toBe(250)
    expect(round(high.subsidy)).toBe(442)
  })

  it('produces the page headline ratio of about 1.77x', () => {
    expect(subsidyRatio(ruokaostostukiBreakdowns())).toBeCloseTo(1.77, 2)
  })

  it('keeps the ratio close to 1.77x regardless of which VAT rates are chosen', () => {
    // The ratio is driven by the expenditure ratio (5034 / 2848), not by the
    // VAT rates — this is the plan's load-bearing claim, so pin it down.
    const atOldRates = subsidyRatio({
      low: deriveVatBreakdown(2848, 0.14, 0.24),
      high: deriveVatBreakdown(5034, 0.14, 0.24),
    })
    const atCurrentRates = subsidyRatio({
      low: deriveVatBreakdown(2848, 0.135, 0.255),
      high: deriveVatBreakdown(5034, 0.135, 0.255),
    })
    expect(atOldRates).toBeCloseTo(1.77, 2)
    expect(atCurrentRates).toBeCloseTo(1.77, 2)
  })
})
