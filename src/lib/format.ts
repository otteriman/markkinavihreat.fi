import type { Locale } from './content'

const INTL_LOCALE: Record<Locale, string> = { fi: 'fi-FI', sv: 'sv-FI', en: 'en-GB' }

/** Formats a rate with the locale's percent conventions, e.g. 0.14 -> "14 %" (fi), "14%" (en). */
export function formatPercent(rate: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate)
}

/** Rounds to the nearest euro and formats with the locale's currency conventions, e.g. "637 €" (fi). */
export function formatEuro(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a chart value. `percent` values are in percent (74.7, not 0.747);
 * `balance` values (a saldoluku, e.g. consumer confidence) carry an explicit
 * sign so a positive balance reads as such — "+4,3" next to "−4,8".
 */
export function formatChartValue(
  value: number,
  format: 'count' | 'percent' | 'balance',
  decimals: number,
  locale: Locale,
): string {
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  if (format === 'percent') {
    return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'percent', ...digits }).format(
      value / 100,
    )
  }
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    ...digits,
    signDisplay: format === 'balance' ? 'exceptZero' : 'auto',
  }).format(value)
}

const QUARTER_LABEL: Record<Locale, (quarter: number, year: number) => string> = {
  fi: (q, y) => `${q}. neljännes ${y}`,
  sv: (q, y) => `kvartal ${q} ${y}`,
  en: (q, y) => `Q${q} ${y}`,
}

/** Formats a Tilastokeskus-style period ("2023", "2023Q2", "2023M06") for display, e.g. "kesäkuu 2023". */
export function formatPeriod(period: string, locale: Locale): string {
  const quarter = period.match(/^(\d{4})Q([1-4])$/)
  if (quarter) return QUARTER_LABEL[locale](Number(quarter[2]), Number(quarter[1]))
  const month = period.match(/^(\d{4})M(\d{2})$/)
  if (month) {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(Number(month[1]), Number(month[2]) - 1, 15)))
  }
  return period
}
