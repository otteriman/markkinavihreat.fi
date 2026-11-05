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

/** Formats with cents, e.g. "4,89 €" (fi) — for the small sums a payslip or a coin chart shows. */
export function formatEuroCents(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
