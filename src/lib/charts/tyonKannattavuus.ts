/**
 * The numbers behind the tyosta-aina-kannattavaa program ("Tehdään työstä
 * aina kannattavaa"): how much of extra pay a person actually keeps, split
 * into what's left for them, what goes to taxes and contributions, and how
 * much their benefits shrink. Single source for the coin chart, the line
 * chart, the payslip and the body copy, so none of them can drift apart.
 *
 * Two example people (decided in docs/suunnitelmat/tyosta-aina-kannattavaa.md):
 * - a single parent on perustoimeentulotuki with one child under 10, renting
 *   in Tampere, working shifts at the retail collective agreement wage;
 * - an IT specialist earning 6 000 €/month, no children.
 *
 * Benefit rules modelled (monthly, as Kela computes them):
 * - Yleinen asumistuki: 70 % of accepted housing costs (capped by
 *   municipality group and household size) minus a perusomavastuu of 50 % of
 *   gross income above 667 € + 94 € per adult + 296 € per child. No earned
 *   income deduction since 1.4.2024.
 * - Perustoimeentulotuki: perusosat + accepted housing costs, minus all
 *   other net income including asumistuki, lapsilisä and elatustuki. Net
 *   earned income counts in full since the 150 € / 20 % ansiotulovähennys
 *   was removed for adults on 1.3.2026 — the reason the single parent keeps
 *   nothing. The old rule is kept as an option for the before/after figure.
 *
 * Sources (via search results; Kela's own pages weren't reachable from the
 * drafting environment — every TODO(tarkistettava) below must be checked
 * against kela.fi before publishing):
 * - Kela / STT, "Toimeentulotuen uudistus voimaan" and "Toimeentulotuki
 *   uudistuu 2026": perusosat from 1.3.2026, removal of ansiotulovähennys.
 * - Kela, "Muutoksia elatustuen ja elatusavun määrään vuonna 2026".
 * - Kela, "Hallitus esittää muutoksia yleiseen asumistukeen" / "Yleinen
 *   asumistuki pienenee vuonna 2024": removal of the 300 € deduction.
 * - Kaupan työehtosopimus, palkkataulukko 1.8.2026 (PAM / tyovuorolista.fi).
 */

import {
  monthlyWageTax,
  type Household,
  type WageTaxParams,
  WAGE_TAX_2026,
} from './ansiotuloverotus2026'

export interface BenefitParams {
  /** Perustoimeentulotuen perusosa, yksinhuoltaja, 1.3.–31.12.2026. */
  singleParentBasicAmount: number
  /** Perusosa of a child under 10: 65 % of the single person's 578,43 €. */
  childBasicAmount: number
  /**
   * Pre-1.3.2026 rule: this share of net earned income, at most
   * `earnedIncomeDisregardMax`, was left out of the income test. 0 = current law.
   */
  earnedIncomeDisregardRate: number
  earnedIncomeDisregardMax: number
  /** Lapsilisä for a first child + yksinhuoltajakorotus. */
  childBenefit: number
  /** Elatustuki, full amount, when the other parent pays no maintenance. */
  childSupport: number
  housingAllowance: {
    /** Share of (accepted housing costs − perusomavastuu) paid. */
    rate: number
    /** Enimmäisasumismenot for this household in this municipality group. */
    maxHousingCosts: number
    /** Perusomavastuu: `omavastuuRate` of gross income above this. */
    incomeThreshold: number
    omavastuuRate: number
    /** Whether elatustuki counts as income for asumistuki. */
    countsChildSupport: boolean
  }
}

export const SINGLE_PARENT_TAMPERE_2026: BenefitParams = {
  singleParentBasicAmount: 665.19,
  // TODO(tarkistettava): sources give 65 % for under-10s; one table's lower
  // bound of 318,14 € may be a later child's reduced share.
  childBasicAmount: 0.65 * 578.43,
  earnedIncomeDisregardRate: 0,
  earnedIncomeDisregardMax: 0,
  // TODO(tarkistettava): 94,88 € is consistent across sources; the
  // yksinhuoltajakorotus is 73,30 € in most, but a few give other figures.
  childBenefit: 94.88 + 73.3,
  childSupport: 197.71,
  housingAllowance: {
    rate: 0.7,
    // TODO(tarkistettava): Tampere is in kuntaryhmä II; 652 € for two people
    // comes from a third-party table only.
    maxHousingCosts: 652,
    incomeThreshold: 667 + 94 * 1 + 296 * 1,
    omavastuuRate: 0.5,
    // TODO(tarkistettava): whether elatustuki is income for asumistuki. Only
    // moves where the single parent leaves toimeentulotuki, not the 0 €.
    countsChildSupport: true,
  },
}

/** The rule before 1.3.2026, for the "tilanne on pahentunut" comparison. */
export const SINGLE_PARENT_TAMPERE_BEFORE_MARCH_2026: BenefitParams = {
  ...SINGLE_PARENT_TAMPERE_2026,
  earnedIncomeDisregardRate: 0.2,
  earnedIncomeDisregardMax: 150,
}

/**
 * Rent of the single parent's two-room flat, €/month, water included.
 * TODO(tarkistettava): must sit within Kela's toimeentulotuki limit for
 * reasonable housing costs in Tampere for two people, so that it is accepted
 * in full. Doesn't affect the 0 €, only how long the line chart stays flat.
 */
export const SINGLE_PARENT_RENT = 800

/**
 * Retail collective agreement hourly wage: palkkaryhmä B, 2nd year, outside
 * the capital region, 2 101 €/month ÷ 160 (table from 1.8.2026).
 * TODO(tarkistettava): the agreement replaced the Myyjä I/II groups with
 * vaativuusluokat on 1.10.2026; pick the class a cashier falls in.
 */
export const RETAIL_HOURLY_WAGE = 2101 / 160

export const SHIFT_HOURS = 4

export const IT_SPECIALIST_MONTHLY_WAGE = 6000
/** Monthly wage ÷ 160, the same divisor the retail agreement uses. */
export const IT_SPECIALIST_HOURLY_WAGE = IT_SPECIALIST_MONTHLY_WAGE / 160

export interface MonthlyBudget {
  grossWage: number
  contributions: number
  incomeTax: number
  netWage: number
  childBenefit: number
  childSupport: number
  housingAllowance: number
  socialAssistance: number
  /** Everything the household has to live on, before rent. */
  total: number
}

const SINGLE_PARENT_HOUSEHOLD: Household = { children: 1, singleParent: true }

export function housingAllowance(grossWage: number, b: BenefitParams, rent: number): number {
  const h = b.housingAllowance
  const income = grossWage + (h.countsChildSupport ? b.childSupport : 0)
  const omavastuu = Math.max(0, income - h.incomeThreshold) * h.omavastuuRate
  return Math.max(0, h.rate * (Math.min(rent, h.maxHousingCosts) - omavastuu))
}

/** The single parent's month at a given gross wage. */
export function singleParentBudget(
  grossWage: number,
  b: BenefitParams = SINGLE_PARENT_TAMPERE_2026,
  rent: number = SINGLE_PARENT_RENT,
  tax: WageTaxParams = WAGE_TAX_2026,
): MonthlyBudget {
  const wage = monthlyWageTax(grossWage, SINGLE_PARENT_HOUSEHOLD, tax)
  const asumistuki = housingAllowance(grossWage, b, rent)
  const disregard = Math.min(wage.net * b.earnedIncomeDisregardRate, b.earnedIncomeDisregardMax)
  const needs = b.singleParentBasicAmount + b.childBasicAmount + rent
  const countedIncome = wage.net - disregard + b.childBenefit + b.childSupport + asumistuki
  const socialAssistance = Math.max(0, needs - countedIncome)
  return {
    grossWage,
    contributions: wage.contributions,
    incomeTax: wage.incomeTax,
    netWage: wage.net,
    childBenefit: b.childBenefit,
    childSupport: b.childSupport,
    housingAllowance: asumistuki,
    socialAssistance,
    total: wage.net + b.childBenefit + b.childSupport + asumistuki + socialAssistance,
  }
}

/** The IT specialist's month: wage only, no benefits. */
export function itSpecialistBudget(
  grossWage: number,
  tax: WageTaxParams = WAGE_TAX_2026,
): MonthlyBudget {
  const wage = monthlyWageTax(grossWage, { children: 0, singleParent: false }, tax)
  return {
    grossWage,
    contributions: wage.contributions,
    incomeTax: wage.incomeTax,
    netWage: wage.net,
    childBenefit: 0,
    childSupport: 0,
    housingAllowance: 0,
    socialAssistance: 0,
    total: wage.net,
  }
}

/** Where extra pay goes: the three shares of the charts. They sum to `extra`. */
export interface ExtraPaySplit {
  extra: number
  /** "Sinulle jää" — the rise in what the household has to live on. */
  kept: number
  /** "Verot ja maksut". */
  taxesAndContributions: number
  /** "Tuki pienenee" — asumistuki and toimeentulotuki combined. */
  benefitCut: number
}

export function splitExtraPay(
  budget: (grossWage: number) => MonthlyBudget,
  baseWage: number,
  extra: number,
): ExtraPaySplit {
  const before = budget(baseWage)
  const after = budget(baseWage + extra)
  const taxesAndContributions =
    after.contributions + after.incomeTax - (before.contributions + before.incomeTax)
  const benefitCut =
    before.housingAllowance +
    before.socialAssistance -
    (after.housingAllowance + after.socialAssistance)
  return { extra, kept: after.total - before.total, taxesAndContributions, benefitCut }
}

/** Kuva 1: what each keeps of 10 € more pay. The single parent works no other hours. */
export function tenEuroSplits(): Record<'singleParent' | 'itSpecialist', ExtraPaySplit> {
  return {
    singleParent: splitExtraPay((w) => singleParentBudget(w), 0, 10),
    itSpecialist: splitExtraPay(itSpecialistBudget, IT_SPECIALIST_MONTHLY_WAGE, 10),
  }
}

/**
 * Kuva 1's second row and the payslip: the single parent's 4-hour shift
 * (one a month, on top of no other work) and the IT specialist's one extra
 * hour at their own hourly value. `before` uses the pre-1.3.2026 rule.
 */
export function shiftSplits(): Record<
  'singleParentShift' | 'singleParentShiftBefore' | 'itSpecialistHour',
  ExtraPaySplit
> {
  const shiftPay = SHIFT_HOURS * RETAIL_HOURLY_WAGE
  return {
    singleParentShift: splitExtraPay((w) => singleParentBudget(w), 0, shiftPay),
    singleParentShiftBefore: splitExtraPay(
      (w) => singleParentBudget(w, SINGLE_PARENT_TAMPERE_BEFORE_MARCH_2026),
      0,
      shiftPay,
    ),
    itSpecialistHour: splitExtraPay(
      itSpecialistBudget,
      IT_SPECIALIST_MONTHLY_WAGE,
      IT_SPECIALIST_HOURLY_WAGE,
    ),
  }
}

export interface CurvePoint {
  hours: number
  /** What the single parent has to live on before rent, €/month. */
  total: number
}

/** Kuva 2: the single parent's monthly money at each number of hours worked. */
export function hoursCurve(
  maxHours = 160,
  step = 1,
  b: BenefitParams = SINGLE_PARENT_TAMPERE_2026,
): CurvePoint[] {
  const points: CurvePoint[] = []
  for (let hours = 0; hours <= maxHours; hours += step) {
    points.push({ hours, total: singleParentBudget(hours * RETAIL_HOURLY_WAGE, b).total })
  }
  return points
}

/**
 * The first whole hour count at which an extra hour raises the single
 * parent's money — the end of Kuva 2's flat stretch ("these hours don't
 * show on your account").
 */
export function flatStretchEnd(b: BenefitParams = SINGLE_PARENT_TAMPERE_2026): number {
  const curve = hoursCurve(320, 1, b)
  const base = curve[0].total
  const firstRise = curve.find((p) => p.total - base > 0.005)
  if (!firstRise) throw new Error('The curve never rises within 320 hours a month')
  return firstRise.hours - 1
}

/**
 * Kuva 2's comparison line: the single parent's money if every euro of pay
 * left them the same share as it leaves the IT specialist (Kuva 1). Not a
 * policy model — there's no up-to-date, costed basic income model to draw
 * instead — but a like-for-like comparison the reader has just seen.
 */
export function sameShareAsItSpecialistCurve(maxHours = 160, step = 1): CurvePoint[] {
  const share = tenEuroSplits().itSpecialist.kept / 10
  const base = singleParentBudget(0).total
  const points: CurvePoint[] = []
  for (let hours = 0; hours <= maxHours; hours += step) {
    points.push({ hours, total: base + hours * RETAIL_HOURLY_WAGE * share })
  }
  return points
}
