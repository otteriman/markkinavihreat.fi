import type { Locale } from './content'

// Origin the OG image files will actually be reachable at. Defaults to
// production; the GitHub Pages preview workflow overrides this (SITE_URL env
// var) to that preview's own origin, since a link shared from a preview build
// needs its og:image to resolve where that build is actually hosted — unlike
// BaseLayout's og:url/canonical, which intentionally always point at
// production regardless of where a build is currently hosted (an SEO signal
// about the page's eventual canonical location, not a fetchable asset).
const SITE_ORIGIN = import.meta.env.SITE_URL || 'https://markkinavihreat.fi'

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

/**
 * Absolute URL of the OG image for a page, for the og:image / twitter:image
 * meta. Includes the configured base path (import.meta.env.BASE_URL) so this
 * still resolves when the build is served from a repo subpath, as the GitHub
 * Pages preview is.
 */
export function ogUrlFor(locale: Locale, path: string): string {
  return `${SITE_ORIGIN}${import.meta.env.BASE_URL}images/og/${ogSlug(locale, path)}.png`
}
