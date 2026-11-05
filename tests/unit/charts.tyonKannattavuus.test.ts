import { describe, expect, it } from 'vitest'
import {
  flatStretchEnd,
  hoursCurve,
  housingAllowance,
  RETAIL_HOURLY_WAGE,
  SHIFT_HOURS,
  shiftSplits,
  SINGLE_PARENT_RENT,
  SINGLE_PARENT_TAMPERE_2026,
  SINGLE_PARENT_TAMPERE_BEFORE_MARCH_2026,
  singleParentBudget,
  splitExtraPay,
  tenEuroSplits,
  type ExtraPaySplit,
} from '../../src/lib/charts/tyonKannattavuus'

function expectSharesSumToExtra(split: ExtraPaySplit) {
  expect(split.kept + split.taxesAndContributions + split.benefitCut).toBeCloseTo(split.extra, 6)
}

describe('singleParentBudget', () => {
  it('tops a jobless month up to the perusosat plus rent', () => {
    const b = SINGLE_PARENT_TAMPERE_2026
    const month = singleParentBudget(0)
    expect(month.total).toBeCloseTo(
      b.singleParentBasicAmount + b.childBasicAmount + SINGLE_PARENT_RENT,
      6,
    )
    expect(month.socialAssistance).toBeGreaterThan(0)
  })

  it('pays full asumistuki until gross income passes the perusomavastuu threshold', () => {
    const b = SINGLE_PARENT_TAMPERE_2026
    const full = b.housingAllowance.rate * b.housingAllowance.maxHousingCosts
    expect(housingAllowance(0, b, SINGLE_PARENT_RENT)).toBeCloseTo(full, 6)
    // Elatustuki counts as income, so the threshold for wages is lower by it.
    const wageThreshold = b.housingAllowance.incomeThreshold - b.childSupport
    expect(housingAllowance(wageThreshold, b, SINGLE_PARENT_RENT)).toBeCloseTo(full, 6)
    expect(housingAllowance(wageThreshold + 100, b, SINGLE_PARENT_RENT)).toBeCloseTo(
      full - b.housingAllowance.rate * b.housingAllowance.omavastuuRate * 100,
      6,
    )
  })
})

describe('splitExtraPay', () => {
  it('leaves the single parent nothing of 10 € more, and the IT specialist about half', () => {
    const { singleParent, itSpecialist } = tenEuroSplits()
    expect(singleParent.kept).toBeCloseTo(0, 6)
    expect(singleParent.benefitCut).toBeGreaterThan(9)
    expect(itSpecialist.kept).toBeCloseTo(4.89, 2)
    expect(itSpecialist.benefitCut).toBe(0)
    expectSharesSumToExtra(singleParent)
    expectSharesSumToExtra(itSpecialist)
  })

  it('taxes the IT specialist’s euro more heavily than the single parent’s', () => {
    // The point of the "sinulle / verot ja maksut / tuki pienenee" framing:
    // the single parent loses everything without paying more tax.
    const { singleParent, itSpecialist } = tenEuroSplits()
    expect(itSpecialist.taxesAndContributions).toBeGreaterThan(singleParent.taxesAndContributions)
  })

  it('leaves the IT specialist more of one hour than the single parent of a whole shift', () => {
    const { singleParentShift, itSpecialistHour } = shiftSplits()
    expect(singleParentShift.extra).toBeCloseTo(SHIFT_HOURS * RETAIL_HOURLY_WAGE, 6)
    expect(singleParentShift.kept).toBeCloseTo(0, 6)
    expect(itSpecialistHour.kept).toBeGreaterThan(singleParentShift.kept + 15)
    expectSharesSumToExtra(singleParentShift)
    expectSharesSumToExtra(itSpecialistHour)
  })

  it('left the single parent 20 % of the shift’s net pay before 1.3.2026', () => {
    const { singleParentShift, singleParentShiftBefore } = shiftSplits()
    const netPay = singleParentShift.extra - singleParentShift.taxesAndContributions
    expect(singleParentShiftBefore.kept).toBeCloseTo(netPay * 0.2, 6)
  })

  it('is the difference between two budgets', () => {
    const split = splitExtraPay((w) => singleParentBudget(w), 1_200, 50)
    expect(split.kept).toBeCloseTo(
      singleParentBudget(1_250).total - singleParentBudget(1_200).total,
      6,
    )
  })
})

describe('hoursCurve', () => {
  it('stays flat up to flatStretchEnd and rises right after', () => {
    const end = flatStretchEnd()
    const curve = hoursCurve(160, 1)
    expect(end).toBeGreaterThan(40)
    for (const point of curve.slice(0, end + 1)) {
      expect(point.total).toBeCloseTo(curve[0].total, 6)
    }
    expect(curve[end + 1].total).toBeGreaterThan(curve[0].total)
  })

  it('has no flat stretch under the pre-1.3.2026 rule', () => {
    expect(flatStretchEnd(SINGLE_PARENT_TAMPERE_BEFORE_MARCH_2026)).toBe(0)
  })
})
