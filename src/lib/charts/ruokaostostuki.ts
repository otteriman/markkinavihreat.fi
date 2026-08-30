/**
 * Derives the "ruokaostostuki" numbers shown on the ruokaostostuki program
 * page: how much VAT a Finnish income quintile actually pays on food today,
 * versus what it would pay at the general VAT rate. The gap is the implicit
 * subsidy the reduced food VAT rate hands out — this module is the single
 * source for it, so the body copy and the chart can never drift apart.
 *
 * Source data: Tilastokeskus, kulutusmenot kulutusyksikköä kohden vuonna
 * 2022, käyvin hinnoin, luokka "01 Elintarvikkeet ja alkoholittomat juomat".
 * Figures are per consumption unit (OECD-modified equivalence scale: first
 * adult 1.0, other adults 0.5, children 0.3), which is what makes the I/V
 * comparison fair regardless of household size — and are at purchaser
 * prices, i.e. VAT-inclusive, so VAT is derived by backing it out of the
 * total rather than adding it on top.
 */

export interface VatBreakdown {
  /** Annual expenditure at purchaser prices (VAT included), per consumption unit. */
  grossExpenditure: number
  /** `grossExpenditure` with VAT backed out at the embedded rate. */
  netExpenditure: number
  /** VAT actually paid today, at the embedded (reduced) rate. */
  vatPaid: number
  /** VAT that would be paid at the general rate. */
  vatAtGeneralRate: number
  /** The gap — vatAtGeneralRate minus vatPaid — the implicit "ruokaostostuki". */
  subsidy: number
}

export function deriveVatBreakdown(
  grossExpenditure: number,
  embeddedVatRate: number,
  generalVatRate: number,
): VatBreakdown {
  const netExpenditure = grossExpenditure / (1 + embeddedVatRate)
  const vatPaid = grossExpenditure - netExpenditure
  const vatAtGeneralRate = netExpenditure * generalVatRate
  return {
    grossExpenditure,
    netExpenditure,
    vatPaid,
    vatAtGeneralRate,
    subsidy: vatAtGeneralRate - vatPaid,
  }
}

/**
 * The reduced food VAT rate actually in force when the 2022 Tilastokeskus
 * consumption data was collected (it dropped to 13.5 % only in 2026) — used
 * to back VAT out of that data. Not the same as the *current* reduced rate;
 * see AGENTS.md on not conflating the two.
 */
export const FOOD_VAT_RATE_2022 = 0.14
/** Finland's current general VAT rate, used as the comparison point throughout. */
export const GENERAL_VAT_RATE = 0.255

// Tilastokeskus, kulutusmenot kulutusyksikköä kohden 2022 (see module docs).
const LOW_QUINTILE_GROSS_EXPENDITURE = 2848
const HIGH_QUINTILE_GROSS_EXPENDITURE = 5034

export function ruokaostostukiBreakdowns(): Record<'low' | 'high', VatBreakdown> {
  return {
    low: deriveVatBreakdown(LOW_QUINTILE_GROSS_EXPENDITURE, FOOD_VAT_RATE_2022, GENERAL_VAT_RATE),
    high: deriveVatBreakdown(HIGH_QUINTILE_GROSS_EXPENDITURE, FOOD_VAT_RATE_2022, GENERAL_VAT_RATE),
  }
}

/** The subsidy ratio between the two quintiles — the page's headline figure. */
export function subsidyRatio(breakdowns: Record<'low' | 'high', VatBreakdown>): number {
  return breakdowns.high.subsidy / breakdowns.low.subsidy
}
