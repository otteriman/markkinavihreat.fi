import { describe, expect, it } from 'vitest'
import { scoredItems } from '../../src/lib/quiz/data'
import {
  bucketOf,
  classify,
  computeResult,
  itemsPerAxis,
  overallScore,
  pickNudges,
  reachableResults,
  resultFromScores,
  runningScores,
  scoreAxes,
} from '../../src/lib/quiz/scoring'
import { TYPE_SLUGS } from '../../src/lib/quiz/types'
import type { Answers, Axis, ScoredItem, TypeSlug } from '../../src/lib/quiz/types'

/**
 * Answers that push each axis to `level` (−2 = lowest score, +2 = highest):
 * every statement gets level × direction, so reversed items are handled.
 */
function answersAt(levels: Record<Axis, number>, finale: string): Answers {
  const answers: Answers = { q10: finale }
  for (const item of scoredItems) {
    if (item.kind === 'statement') answers[item.id] = levels[item.axis] * item.direction
  }
  return answers
}

describe('item counts', () => {
  it('has 4 markets, 4 environment and 3 freedom items', () => {
    expect(itemsPerAxis()).toEqual({ markets: 4, environment: 4, freedom: 3 })
  })
})

describe('scoreAxes', () => {
  it('does not give 100 everywhere when every statement is answered "strongly agree"', () => {
    const answers: Answers = { q10: 'price' }
    for (const item of scoredItems) if (item.kind === 'statement') answers[item.id] = 2
    const s = scoreAxes(answers)
    // Reversed items (q4, q5, q6) pull their axes down.
    expect(s).toEqual({ markets: 75, environment: 75, freedom: 67 })
    expect(Object.values(s).every((v) => v < 100)).toBe(true)
  })

  it('gives 50 on every axis for all-neutral answers', () => {
    const answers: Answers = { q10: 'neither' }
    for (const item of scoredItems) if (item.kind === 'statement') answers[item.id] = 0
    // "neither" is (0, −2); a neutral finale does not exist, so neutralise it by skipping.
    answers.q10 = null
    expect(scoreAxes(answers)).toEqual({ markets: 50, environment: 50, freedom: 50 })
  })

  it('treats missing answers like skipped ones', () => {
    expect(scoreAxes({})).toEqual({ markets: 50, environment: 50, freedom: 50 })
  })

  it('reaches 100 and 0 on every axis with the best and worst answers', () => {
    const high = { markets: 2, environment: 2, freedom: 2 }
    const low = { markets: -2, environment: -2, freedom: -2 }
    // The finale couples two axes, so each axis uses the option that favours it.
    expect(scoreAxes(answersAt(high, 'price'))).toEqual({
      markets: 100,
      environment: 100,
      freedom: 100,
    })
    expect(scoreAxes(answersAt(low, 'bans')).markets).toBe(0)
    expect(scoreAxes(answersAt(low, 'neither')).environment).toBe(0)
    expect(scoreAxes(answersAt(low, 'neither')).freedom).toBe(0)
  })

  it('clamps out-of-range statement answers', () => {
    const wild = answersAt({ markets: 2, environment: 2, freedom: 2 }, 'price')
    wild.q1 = 99
    expect(scoreAxes(wild)).toEqual(
      scoreAxes(answersAt({ markets: 2, environment: 2, freedom: 2 }, 'price')),
    )
  })
})

describe('types', () => {
  const fixtures: Record<TypeSlug, Answers> = {
    pigou: answersAt({ markets: 2, environment: 2, freedom: 2 }, 'price'),
    liberal: answersAt({ markets: 2, environment: -2, freedom: 2 }, 'neither'),
    ecologist: answersAt({ markets: -2, environment: 2, freedom: 2 }, 'bans'),
    engineer: answersAt({ markets: 2, environment: 2, freedom: -2 }, 'price'),
    focused: answersAt({ markets: 2, environment: -2, freedom: -2 }, 'neither'),
    free: answersAt({ markets: -2, environment: -2, freedom: -2 }, 'neither'),
  }

  it.each(TYPE_SLUGS)('reaches the "%s" type', (slug) => {
    expect(computeResult(fixtures[slug]).type).toBe(slug)
  })

  it('counts an axis of exactly 60 as high and 59 as not', () => {
    expect(classify({ markets: 60, environment: 60, freedom: 60 })).toBe('pigou')
    expect(classify({ markets: 59, environment: 60, freedom: 60 })).toBe('ecologist')
    expect(classify({ markets: 59, environment: 59, freedom: 59 })).toBe('free')
    expect(classify({ markets: 60, environment: 59, freedom: 59 })).toBe('focused')
  })

  it('maps each pair of high axes to its type', () => {
    expect(classify({ markets: 80, environment: 20, freedom: 80 })).toBe('liberal')
    expect(classify({ markets: 20, environment: 80, freedom: 80 })).toBe('ecologist')
    expect(classify({ markets: 80, environment: 80, freedom: 20 })).toBe('engineer')
  })
})

describe('buckets', () => {
  it('rounds to the nearest 10, halves up', () => {
    expect(bucketOf(74)).toBe(70)
    expect(bucketOf(75)).toBe(80)
    expect(bucketOf(0)).toBe(0)
    expect(bucketOf(100)).toBe(100)
  })

  it('derives the overall score from the rounded mean of the axes', () => {
    expect(overallScore({ markets: 82, environment: 79, freedom: 85 })).toBe(82)
  })
})

describe('reachableResults', () => {
  const results = reachableResults()

  it('only lists pigou buckets of 60 and up', () => {
    const buckets = results.filter((r) => r.type === 'pigou').map((r) => r.bucket)
    expect(Math.min(...buckets)).toBe(60)
    expect(Math.max(...buckets)).toBe(100)
  })

  it('covers every type', () => {
    for (const slug of TYPE_SLUGS) expect(results.some((r) => r.type === slug)).toBe(true)
  })

  it('includes the bucket of every fixture-style result', () => {
    const r = computeResult(answersAt({ markets: 2, environment: -2, freedom: 2 }, 'neither'))
    expect(results).toContainEqual({ type: r.type, bucket: r.bucket })
  })

  it('has no duplicates and only multiples of 10', () => {
    const keys = results.map((r) => `${r.type}-${r.bucket}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(results.every((r) => r.bucket % 10 === 0 && r.bucket >= 0 && r.bucket <= 100)).toBe(true)
  })
})

describe('runningScores', () => {
  it('is 50 on every axis before anything is answered', () => {
    expect(runningScores({})).toEqual({ markets: 50, environment: 50, freedom: 50 })
  })

  it('only looks at the items answered so far', () => {
    // q1 (markets, +1) strongly agreed: (2 + 2) / 4 = 100 on markets alone.
    expect(runningScores({ q1: 2 })).toEqual({ markets: 100, environment: 50, freedom: 50 })
    // q4 is reversed: strong agreement lowers markets.
    expect(runningScores({ q4: 2 }).markets).toBe(0)
  })

  it('counts a skipped item as answered with 0', () => {
    expect(runningScores({ q1: null })).toEqual({ markets: 50, environment: 50, freedom: 50 })
  })

  it('equals the final scores once every item is answered', () => {
    const answers = answersAt({ markets: 1, environment: -1, freedom: 2 }, 'bans')
    expect(runningScores(answers)).toEqual(scoreAxes(answers))
  })
})

describe('pickNudges', () => {
  const linked = ['a', 'b', 'c'].map((id, i) => ({
    id,
    kind: 'statement',
    axis: 'markets',
    direction: i === 2 ? -1 : 1,
    ui: 'buttons',
    text: { fi: '', sv: '', en: '' },
    relatedLink: { href: { fi: '/', sv: '/', en: '/' }, label: { fi: '', sv: '', en: '' } },
  })) as ScoredItem[]

  it('returns the two strongest agreements, after direction', () => {
    // c is reversed, so −2 means agreement 2 after direction.
    const picked = pickNudges({ a: 1, b: 1, c: -2 }, linked)
    expect(picked.map((s) => s.id)).toEqual(['c', 'a'])
  })

  it('ignores disagreement, neutral and skipped answers', () => {
    expect(pickNudges({ a: 0, b: -1, c: null }, linked)).toEqual([])
  })

  it('ignores statements without a related link', () => {
    expect(pickNudges({ q1: 2 })).toEqual([])
  })
})

describe('resultFromScores', () => {
  it('derives overall, bucket and type from axis scores', () => {
    expect(resultFromScores({ markets: 82, environment: 79, freedom: 85 })).toEqual({
      scores: { markets: 82, environment: 79, freedom: 85 },
      overall: 82,
      bucket: 80,
      type: 'pigou',
    })
  })

  it('agrees with computeResult', () => {
    const answers = answersAt({ markets: 1, environment: -1, freedom: 2 }, 'bans')
    const r = computeResult(answers)
    expect(resultFromScores(r.scores)).toEqual(r)
  })
})
