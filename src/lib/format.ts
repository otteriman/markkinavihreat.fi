import type { Locale } from './content'

const INTL_LOCALE: Record<Locale, string> = { fi: 'fi-FI', sv: 'sv-FI', en: 'en-GB' }

/** Rounds to the nearest euro and formats with the locale's currency conventions, e.g. "637 €" (fi). */
export function formatEuro(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}
