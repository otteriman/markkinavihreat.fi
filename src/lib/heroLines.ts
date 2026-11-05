/**
 * A program's hero heading lines (`heroLines` frontmatter) may mark words for
 * the accent colour with asterisks: `"*aina* kannattavaa"`. Without any marker
 * in any line, the whole last line gets the accent, as it always has — so
 * every existing program renders exactly as before. Shared by ProgramHero and
 * the OG image, so the page and its share image always agree.
 */

export interface HeroSegment {
  text: string
  accent: boolean
}

const MARKER = /\*([^*]+)\*/g

export function hasAccentMarkers(lines: string[]): boolean {
  return lines.some((line) => /\*[^*]+\*/.test(line))
}

/** Splits one line into plain and accented runs, dropping the asterisks. */
export function lineSegments(line: string): HeroSegment[] {
  const segments: HeroSegment[] = []
  let last = 0
  for (const match of line.matchAll(MARKER)) {
    if (match.index > last) segments.push({ text: line.slice(last, match.index), accent: false })
    segments.push({ text: match[1], accent: true })
    last = match.index + match[0].length
  }
  if (last < line.length) segments.push({ text: line.slice(last), accent: false })
  return segments
}

/** Every line's segments, applying the last-line default when nothing is marked. */
export function heroSegments(lines: string[]): HeroSegment[][] {
  if (hasAccentMarkers(lines)) return lines.map(lineSegments)
  return lines.map((line, i) => [{ text: line, accent: i === lines.length - 1 }])
}

/** The heading as plain text, markers removed — for titles and alt text. */
export function plainHeroText(lines: string[]): string {
  return lines.map((line) => line.replace(MARKER, '$1')).join(' ')
}
