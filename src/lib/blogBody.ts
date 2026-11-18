/**
 * Blog posts are plain markdown rendered by Astro, which can't place a
 * component mid-post. A paragraph holding only a "[kuvaaja: <id>]" marker —
 * the same marker program bodies use (see lib/programSections.ts) — is the
 * escape hatch: the rendered HTML is split at each one, so the post page can
 * render the chart component between the HTML segments.
 */
export type BlogBodySegment = { type: 'html'; html: string } | { type: 'chart'; id: string }

// Astro renders the marker paragraph as `<p>[kuvaaja: id]</p>`. Anchored to
// the whole paragraph, like CHART_MARKER, so a bracketed aside inside running
// text is never mistaken for one.
const CHART_PARAGRAPH = /<p>\s*\[kuvaaja:\s*([a-z0-9-]+)\]\s*<\/p>/g

export function splitChartMarkers(html: string): BlogBodySegment[] {
  const segments: BlogBodySegment[] = []
  let last = 0
  for (const match of html.matchAll(CHART_PARAGRAPH)) {
    const before = html.slice(last, match.index)
    if (before.trim()) segments.push({ type: 'html', html: before })
    segments.push({ type: 'chart', id: match[1] })
    last = match.index + match[0].length
  }
  const rest = html.slice(last)
  if (rest.trim()) segments.push({ type: 'html', html: rest })
  return segments
}

/**
 * Prefixes root-relative links in rendered post HTML (`href="/ehdotukset/..."`)
 * with the site's base path, the way localePath() prefixes routes in
 * components — so a post's internal links also work in a subpath preview.
 * A no-op when the base is "/", as in production.
 */
export function withBaseLinks(html: string, base: string): string {
  const prefix = base.replace(/\/$/, '')
  if (!prefix) return html
  return html.replace(/(<a\s[^>]*?href=")(\/(?!\/))/g, `$1${prefix}$2`)
}
