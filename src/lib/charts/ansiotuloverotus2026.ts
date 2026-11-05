/**
 * Finnish taxes and employee contributions on wage income in tax year 2026 —
 * the "verot ja maksut" share in the tyosta-aina-kannattavaa program's charts.
 *
 * Scope is deliberately narrow: an employee aged 18–64 whose only earned
 * income is wages, no deductions beyond the automatic ones, and no church tax
 * by default (membership varies, and leaving it out understates the high
 * earner's tax, which errs against our own argument rather than for it).
 *
 * Everything is computed on an annual basis, as Finnish income tax is. A
 * monthly figure is modelled as "the same every month of the year"; see
 * netWage().
 *
 * Sources (all for 2026; checked via search results, as the official sites
 * weren't reachable from the drafting environment — re-check before
 * publishing, see docs/suunnitelmat/tyosta-aina-kannattavaa.md):
 * - State tax scale, työtulovähennys, perusvähennys: Valtioneuvosto,
 *   "Valtion talousarvioesitys: Vuoden 2026 veromuutokset kootusti";
 *   Verohallinto, "Verohallinnon päätös ennakonpidätysprosenttien
 *   laskentaperusteista … vuodelle 2026"; Veronmaksajat, "Ansiotulosta
 *   tehtävät vähennykset 2026".
 * - Average municipal tax: Veronmaksajat / Kuntaliitto, "Kuntien
 *   veroprosentit 2026" (income-weighted mainland average).
 * - Employee contributions: Veronmaksajat, "Työttömyysvakuutusmaksu 2026",
 *   "Sairausvakuutusmaksut 2026", "Eläkevakuutusmaksut 2026–2014";
 *   Valtioneuvosto, "Sairausvakuutusmaksut nousevat hieman vuonna 2026".
 */

export interface TaxBracket {
  /** Lower bound of the bracket, € of taxable income per year. */
  from: number
  /** Marginal rate within the bracket. */
  rate: number
}

export interface WageTaxParams {
  /** Työntekijän työeläkemaksu (TyEL), share of gross wage. Same for all ages from 2026. */
  pensionRate: number
  /** Palkansaajan työttömyysvakuutusmaksu, share of gross wage. */
  unemploymentRate: number
  /** Sairausvakuutuksen päivärahamaksu, share of gross wage … */
  dailyAllowanceRate: number
  /** … charged only if the year's wages reach this (then on all of them). */
  dailyAllowanceThreshold: number
  /** Tulonhankkimisvähennys: automatic, at most this, never more than the wage. */
  incomeAcquisitionDeductionMax: number
  /** Perusvähennys (municipal taxation): maximum … */
  basicDeductionMax: number
  /** … reduced by this share of net income exceeding the maximum. */
  basicDeductionPhaseOut: number
  /** Valtion tuloveroasteikko. */
  stateBrackets: TaxBracket[]
  /** Kunnallisvero; the income-weighted average across mainland Finland. */
  municipalRate: number
  /** Kirkollisvero; 0 = not a church member. */
  churchRate: number
  /** Sairaanhoitomaksu on wage income, levied on the municipal tax base. */
  healthCareRate: number
  /** Työtulovähennys, credited against the taxes above (state tax first). */
  workIncomeDeduction: {
    rate: number
    max: number
    /** Added to `max` per minor child … */
    perChild: number
    /** … and multiplied by this for a single parent. */
    singleParentMultiplier: number
    /** Reduced by `phaseOutRate` of net earned income between these bounds. */
    phaseOutStart: number
    phaseOutEnd: number
    phaseOutRate: number
  }
  /** Yle-vero: `rate` of earned income above `threshold`, capped at `max`. */
  yleTax: { threshold: number; rate: number; max: number }
}

export const WAGE_TAX_2026: WageTaxParams = {
  pensionRate: 0.073,
  unemploymentRate: 0.0089,
  dailyAllowanceRate: 0.0088,
  dailyAllowanceThreshold: 17_255,
  incomeAcquisitionDeductionMax: 750,
  basicDeductionMax: 4_265,
  basicDeductionPhaseOut: 0.18,
  stateBrackets: [
    { from: 0, rate: 0.1264 },
    { from: 22_000, rate: 0.19 },
    { from: 32_600, rate: 0.3025 },
    { from: 40_100, rate: 0.3325 },
    { from: 52_100, rate: 0.375 },
  ],
  municipalRate: 0.0757,
  churchRate: 0,
  healthCareRate: 0.011,
  workIncomeDeduction: {
    rate: 0.18,
    max: 3_430,
    perChild: 105,
    singleParentMultiplier: 2,
    phaseOutStart: 35_000,
    phaseOutEnd: 50_550,
    phaseOutRate: 0.02,
  },
  // TODO(tarkistettava): one source gives a 160 € cap; 163 € has been the cap
  // in recent years. Irrelevant to every figure the page shows (the low
  // earner stays under the threshold, the high earner is capped either way).
  yleTax: { threshold: 15_150, rate: 0.025, max: 163 },
}

export interface Household {
  /** Minor children the earner is entitled to the työtulovähennys increase for. */
  children: number
  singleParent: boolean
}

const NO_CHILDREN: Household = { children: 0, singleParent: false }

export interface AnnualWageTax {
  gross: number
  /** TyEL + työttömyysvakuutusmaksu + päivärahamaksu. */
  contributions: number
  /** State + municipal + church tax + sairaanhoitomaksu + Yle-vero, after työtulovähennys. */
  incomeTax: number
  net: number
}

function progressiveTax(income: number, brackets: TaxBracket[]): number {
  let tax = 0
  brackets.forEach((bracket, i) => {
    const upper = brackets[i + 1]?.from ?? Infinity
    if (income > bracket.from) tax += (Math.min(income, upper) - bracket.from) * bracket.rate
  })
  return tax
}

/** Taxes and contributions on a year's wages. */
export function annualWageTax(
  grossAnnual: number,
  household: Household = NO_CHILDREN,
  p: WageTaxParams = WAGE_TAX_2026,
): AnnualWageTax {
  const gross = Math.max(0, grossAnnual)
  const dailyAllowance = gross >= p.dailyAllowanceThreshold ? gross * p.dailyAllowanceRate : 0
  const contributions = gross * (p.pensionRate + p.unemploymentRate) + dailyAllowance

  // The contributions are tulonhankkimismenot in their own right; the 750 €
  // tulonhankkimisvähennys covers other work costs on top of them.
  const netEarned = Math.max(
    0,
    gross - contributions - Math.min(gross, p.incomeAcquisitionDeductionMax),
  )

  const basicDeduction = Math.max(
    0,
    p.basicDeductionMax - Math.max(0, netEarned - p.basicDeductionMax) * p.basicDeductionPhaseOut,
  )
  const municipalBase = Math.max(0, netEarned - basicDeduction)

  const state = progressiveTax(netEarned, p.stateBrackets)
  const local = municipalBase * (p.municipalRate + p.churchRate + p.healthCareRate)

  const w = p.workIncomeDeduction
  const childIncrease =
    household.children * w.perChild * (household.singleParent ? w.singleParentMultiplier : 1)
  const phaseOutBase = Math.min(
    Math.max(0, netEarned - w.phaseOutStart),
    w.phaseOutEnd - w.phaseOutStart,
  )
  const workIncomeDeduction = Math.max(
    0,
    Math.min(gross * w.rate, w.max + childIncrease) - phaseOutBase * w.phaseOutRate,
  )

  const yle = Math.min(Math.max(0, gross - p.yleTax.threshold) * p.yleTax.rate, p.yleTax.max)
  const incomeTax = Math.max(0, state + local - workIncomeDeduction) + yle

  return { gross, contributions, incomeTax, net: gross - contributions - incomeTax }
}

/**
 * Monthly net wage, assuming the same gross every month of the year — the
 * steady state a "this is what you get each month" comparison describes.
 */
export function monthlyWageTax(
  grossMonthly: number,
  household: Household = NO_CHILDREN,
  p: WageTaxParams = WAGE_TAX_2026,
): AnnualWageTax {
  const annual = annualWageTax(grossMonthly * 12, household, p)
  return {
    gross: annual.gross / 12,
    contributions: annual.contributions / 12,
    incomeTax: annual.incomeTax / 12,
    net: annual.net / 12,
  }
}
