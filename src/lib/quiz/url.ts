import { reachableResults } from './scoring'
import { TYPE_SLUGS } from './types'
import type { Scores, TypeSlug } from './types'

// Result URL: /testi/tulos/<type>-<bucket>/?m=82&y=79&v=85[&cm=..&cy=..&cv=..]#a=2,1,0,…
// The query carries the exact axis scores, the hash the per-question answers
// (the hash never reaches servers or analytics).

const SCORE_RE = /^\d+(\.\d+)?$/

/** Integer 0–100 from a query value; non-integers are rounded, out-of-range clamped, junk is null. */
export function parseScore(value: string | null | undefined): number | null {
  if (value == null || !SCORE_RE.test(value.trim())) return null
  return Math.max(0, Math.min(100, Math.round(Number(value))))
}

function parseTriple(params: URLSearchParams, keys: [string, string, string]): Scores | null {
  const [m, y, v] = keys.map((k) => parseScore(params.get(k)))
  if (m === null || y === null || v === null) return null
  return { markets: m, environment: y, freedom: v }
}

const toParams = (search: string | URLSearchParams) =>
  typeof search === 'string' ? new URLSearchParams(search) : search

/** The user's own scores (`m`, `y`, `v`), or null if any is missing or invalid. */
export function parseScores(search: string | URLSearchParams): Scores | null {
  return parseTriple(toParams(search), ['m', 'y', 'v'])
}

/** The challenging friend's scores (`cm`, `cy`, `cv`), or null. */
export function parseChallenger(search: string | URLSearchParams): Scores | null {
  return parseTriple(toParams(search), ['cm', 'cy', 'cv'])
}

export function encodeScores(scores: Scores, challenger?: Scores | null): string {
  const q = new URLSearchParams({
    m: String(scores.markets),
    y: String(scores.environment),
    v: String(scores.freedom),
  })
  if (challenger) {
    q.set('cm', String(challenger.markets))
    q.set('cy', String(challenger.environment))
    q.set('cv', String(challenger.freedom))
  }
  return `?${q}`
}

/** Link to hand a friend: the user's scores become the friend's `cm/cy/cv`. */
export function encodeChallenge(scores: Scores): string {
  return `?${new URLSearchParams({
    cm: String(scores.markets),
    cy: String(scores.environment),
    cv: String(scores.freedom),
  })}`
}

/** Raw statement answers (−2…+2, before direction), as `#a=2,1,0,…`. Skipped = 0. */
export function encodeAnswersHash(values: (number | null)[]): string {
  return `#a=${values.map((v) => Math.max(-2, Math.min(2, Math.round(v ?? 0)))).join(',')}`
}

/** Parses `#a=…`; returns null unless it holds exactly `expected` integers in −2…+2. */
export function parseAnswersHash(hash: string, expected: number): number[] | null {
  const match = /^#?a=(-?\d(?:,-?\d)*)$/.exec(hash)
  if (!match) return null
  const values = match[1].split(',').map(Number)
  if (values.length !== expected || values.some((v) => v < -2 || v > 2)) return null
  return values
}

/** `pigou-80` → { type, bucket }, or null if it is not a reachable result page. */
export function parseResultSlug(slug: string): { type: TypeSlug; bucket: number } | null {
  const match = /^([a-z]+)-(\d{1,3})$/.exec(slug)
  if (!match) return null
  const type = match[1] as TypeSlug
  const bucket = Number(match[2])
  if (!TYPE_SLUGS.includes(type)) return null
  return reachableResults().some((r) => r.type === type && r.bucket === bucket)
    ? { type, bucket }
    : null
}

/** Path below the locale root, e.g. /testi/tulos/pigou-80/ (apply localePath() for the locale). */
export const resultPath = (type: TypeSlug, bucket: number) => `/testi/tulos/${type}-${bucket}/`
