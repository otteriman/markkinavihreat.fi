import type { Locale } from './content'

// Absolute production origin. Open Graph images must be absolute URLs, so —
// like BaseLayout's og:url — these always point at production, even on the
// noindex GitHub Pages preview (which isn't scraped for link previews).
const SITE_URL = 'https://markkinavihreat.fi'

/**
 * Deterministic, filesystem-safe id for a page's OG image, derived purely from
 * its locale and route path. Shared by BaseLayout (which emits the <meta>) and
 * the /images/og/[slug].png endpoint (which emits the file) so the two can
 * never drift — the single invariant this feature depends on.
 *
 * e.g. ("fi", "/") -> "fi-home", ("sv", "/manifesti/") -> "sv-manifesti",
 * ("fi", "/ehdotukset/lisaa-markkinoita/") -> "fi-ehdotukset-lisaa-markkinoita".
 */
export function ogSlug(locale: Locale, path: string): string {
  const segments = path.split('/').filter(Boolean)
  return [locale, ...(segments.length > 0 ? segments : ['home'])].join('-')
}

/** Absolute URL of the OG image for a page, for the og:image / twitter:image meta. */
export function ogUrlFor(locale: Locale, path: string): string {
  return `${SITE_URL}/images/og/${ogSlug(locale, path)}.png`
}
