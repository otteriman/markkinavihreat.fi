import { describe, expect, it } from 'vitest'
import {
  annualWageTax,
  monthlyWageTax,
  WAGE_TAX_2026,
} from '../../src/lib/charts/ansiotuloverotus2026'

describe('annualWageTax', () => {
  it('charges nothing on no wage', () => {
    expect(annualWageTax(0)).toEqual({ gross: 0, contributions: 0, incomeTax: 0, net: 0 })
  })

  it('matches a hand calculation at 72 000 €/year (the IT specialist)', () => {
    // Contributions: 7,30 + 0,89 + 0,88 % of 72 000 = 6 530,40.
    // Net earned income: 72 000 − 6 530,40 − 750 = 64 719,60; no perusvähennys.
    // State tax: 11 053,55 at 52 100 + 37,5 % × 12 619,60 = 15 785,90.
    // Municipal + sairaanhoitomaksu: (7,57 + 1,10) % × 64 719,60 = 5 611,19.
    // Työtulovähennys: 3 430 − 2 % × (50 550 − 35 000) = 3 119.
    // Yle-vero: capped at 163.
    const tax = annualWageTax(72_000)
    expect(tax.contributions).toBeCloseTo(6_530.4, 2)
    expect(tax.incomeTax).toBeCloseTo(15_785.9 + 5_611.19 - 3_119 + 163, 1)
    expect(tax.net).toBeCloseTo(72_000 - tax.contributions - tax.incomeTax, 6)
  })

  it('takes about half of extra pay from the IT specialist', () => {
    const marginal = (annualWageTax(72_120).net - annualWageTax(72_000).net) / 120
    // 9,07 % contributions + (1 − 9,07 %) × 46,17 % taxes ≈ 51 % gone.
    expect(1 - marginal).toBeCloseTo(0.5105, 3)
  })

  it('leaves only the pension and unemployment contributions on a small wage', () => {
    const tax = annualWageTax(630)
    expect(tax.incomeTax).toBe(0)
    expect(tax.contributions).toBeCloseTo(630 * (0.073 + 0.0089), 6)
  })

  it('charges the päivärahamaksu on the whole wage only from its threshold up', () => {
    const { dailyAllowanceThreshold: threshold, dailyAllowanceRate: rate } = WAGE_TAX_2026
    const below = annualWageTax(threshold - 1)
    const at = annualWageTax(threshold)
    expect(at.contributions - below.contributions).toBeCloseTo(
      threshold * rate + (0.073 + 0.0089),
      6,
    )
  })

  it('raises a single parent’s work income deduction cap by twice the per-child amount', () => {
    // At 40 000 € the uncapped 18 % (7 200 €) exceeds both caps, so the
    // difference is the child increase net of nothing else: 2 × 105 €.
    const without = annualWageTax(40_000)
    const singleParent = annualWageTax(40_000, { children: 1, singleParent: true })
    expect(without.incomeTax - singleParent.incomeTax).toBeCloseTo(210, 6)
  })
})

describe('monthlyWageTax', () => {
  it('is the annual result for twelve equal months, divided by twelve', () => {
    const annual = annualWageTax(6_000 * 12)
    const monthly = monthlyWageTax(6_000)
    expect(monthly.net * 12).toBeCloseTo(annual.net, 6)
    expect(monthly.incomeTax * 12).toBeCloseTo(annual.incomeTax, 6)
  })
})
