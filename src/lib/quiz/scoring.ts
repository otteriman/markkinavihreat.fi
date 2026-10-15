import { scoredItems as defaultItems } from './data'
import { TYPE_SLUGS } from './types'
import type { Answers, Axis, ScoredItem, Scores, Statement, TypeSlug } from './types'

export const HIGH_THRESHOLD = 60

const clampAnswer = (v: number) => Math.max(-2, Math.min(2, Math.round(v)))

/**
 * Per-axis contributions p_i of the items in `answers`. With `onlyAnswered`,
 * items without a key (not reached yet) are left out; otherwise they count as 0
 * like skipped ones. Skipped items (null) always count as 0.
 */
function contributions(
  items: ScoredItem[],
  answers: Answers,
  onlyAnswered: boolean,
): Record<Axis, number[]> {
  const out: Record<Axis, number[]> = { markets: [], environment: [], freedom: [] }
  for (const item of items) {
    const reached = item.id in answers
    if (onlyAnswered && !reached) continue
    const raw = answers[item.id] ?? null
    if (item.kind === 'statement') {
      const n = typeof raw === 'number' && Number.isFinite(raw) ? clampAnswer(raw) : 0
      out[item.axis].push(n * item.direction)
    } else {
      const option = item.options.find((o) => o.id === raw)
      out.markets.push(option?.markets ?? 0)
      out.environment.push(option?.environment ?? 0)
    }
  }
  return out
}

/** Number of scored items per axis (markets 4, environment 4, freedom 3 in the shipped quiz). */
export function itemsPerAxis(items: ScoredItem[] = defaultItems): Record<Axis, number> {
  const n: Record<Axis, number> = { markets: 0, environment: 0, freedom: 0 }
  for (const item of items) {
    if (item.kind === 'statement') n[item.axis]++
    else {
      n.markets++
      n.environment++
    }
  }
  return n
}

const toAxisScore = (sum: number, n: number) => Math.round(((sum + 2 * n) / (4 * n)) * 100)

/** Final axis scores, integers 0–100. Unanswered and skipped items count as 0. */
export function scoreAxes(answers: Answers, items: ScoredItem[] = defaultItems): Scores {
  const n = itemsPerAxis(items)
  const p = contributions(items, answers, false)
  const sum = (a: Axis) => p[a].reduce((s, v) => s + v, 0)
  return {
    markets: toAxisScore(sum('markets'), n.markets),
    environment: toAxisScore(sum('environment'), n.environment),
    freedom: toAxisScore(sum('freedom'), n.freedom),
  }
}

/**
 * Scores over the items reached so far, for the growing tree (plan section
 * 7.5): (Σp + 2k) / (4k) × 100 with k the reached items on the axis, and 50
 * when k = 0.
 */
export function runningScores(answers: Answers, items: ScoredItem[] = defaultItems): Scores {
  const p = contributions(items, answers, true)
  const score = (a: Axis) =>
    p[a].length === 0
      ? 50
      : toAxisScore(
          p[a].reduce((s, v) => s + v, 0),
          p[a].length,
        )
  return { markets: score('markets'), environment: score('environment'), freedom: score('freedom') }
}

export const overallScore = (s: Scores) => Math.round((s.markets + s.environment + s.freedom) / 3)

export const isHigh = (score: number) => score >= HIGH_THRESHOLD

/** Overall score rounded to the nearest 10 (0, 10, …, 100). */
export const bucketOf = (overall: number) => Math.round(overall / 10) * 10

/** Result type, evaluated in the order of plan section 6. */
export function classify(s: Scores): TypeSlug {
  const m = isHigh(s.markets)
  const e = isHigh(s.environment)
  const f = isHigh(s.freedom)
  const highs = [m, e, f].filter(Boolean).length
  if (highs === 3) return 'pigou'
  if (m && f) return 'liberal'
  if (e && f) return 'ecologist'
  if (m && e) return 'engineer'
  if (highs === 1) return 'focused'
  return 'free'
}

export interface QuizResult {
  scores: Scores
  overall: number
  bucket: number
  type: TypeSlug
}

export function computeResult(answers: Answers, items: ScoredItem[] = defaultItems): QuizResult {
  const scores = scoreAxes(answers, items)
  const overall = overallScore(scores)
  return { scores, overall, bucket: bucketOf(overall), type: classify(scores) }
}

/** Every sum of `count`-many values from -2…+2 that can be reached. */
function reachableSums(count: number): number[] {
  let sums = new Set([0])
  for (let i = 0; i < count; i++) {
    const next = new Set<number>()
    for (const s of sums) for (let v = -2; v <= 2; v++) next.add(s + v)
    sums = next
  }
  return [...sums]
}

/**
 * Every type/bucket combination that some set of answers can produce, so that
 * only reachable result pages are generated. Exact, because the finale couples
 * the markets and environment axes.
 */
export function reachableResults(
  items: ScoredItem[] = defaultItems,
): { type: TypeSlug; bucket: number }[] {
  const statements = items.filter((i): i is Statement => i.kind === 'statement')
  const finale = items.find((i) => i.kind === 'finale')
  const n = itemsPerAxis(items)
  const stmtCount = (a: Axis) => statements.filter((s) => s.axis === a).length
  const sums: Record<Axis, number[]> = {
    markets: reachableSums(stmtCount('markets')),
    environment: reachableSums(stmtCount('environment')),
    freedom: reachableSums(stmtCount('freedom')),
  }
  const options = (
    finale?.kind === 'finale' ? finale.options : [{ markets: 0, environment: 0 }]
  ) as {
    markets: number
    environment: number
  }[]

  const seen = new Set<string>()
  for (const o of options)
    for (const m of sums.markets)
      for (const e of sums.environment)
        for (const f of sums.freedom) {
          const scores: Scores = {
            markets: toAxisScore(m + o.markets, n.markets),
            environment: toAxisScore(e + o.environment, n.environment),
            freedom: toAxisScore(f, n.freedom),
          }
          seen.add(`${classify(scores)}:${bucketOf(overallScore(scores))}`)
        }
  return [...seen]
    .map((k) => {
      const [type, bucket] = k.split(':')
      return { type: type as TypeSlug, bucket: Number(bucket) }
    })
    .sort((a, b) => TYPE_SLUGS.indexOf(a.type) - TYPE_SLUGS.indexOf(b.type) || a.bucket - b.bucket)
}

/**
 * Up to `max` statements the user agreed with (answer × direction ≥ +1) that
 * have a related link, strongest agreement first, then question order.
 */
export function pickNudges(
  answers: Answers,
  items: ScoredItem[] = defaultItems,
  max = 2,
): Statement[] {
  return items
    .filter((i): i is Statement => i.kind === 'statement' && !!i.relatedLink)
    .map((s, order) => {
      const raw = answers[s.id]
      return { s, order, agreement: typeof raw === 'number' ? clampAnswer(raw) * s.direction : 0 }
    })
    .filter((x) => x.agreement >= 1)
    .sort((a, b) => b.agreement - a.agreement || a.order - b.order)
    .slice(0, max)
    .map((x) => x.s)
}
