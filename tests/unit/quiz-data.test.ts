import { describe, expect, it } from 'vitest'
import { items, resultTypes, scoredItems, t } from '../../src/lib/quiz/data'
import { LANGS, TYPE_SLUGS } from '../../src/lib/quiz/types'
import type { Localized } from '../../src/lib/quiz/types'

function localized(value: unknown): Localized[] {
  if (Array.isArray(value)) return value.flatMap(localized)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (LANGS.every((l) => typeof obj[l] === 'string')) return [obj as Localized]
    return Object.values(obj).flatMap(localized)
  }
  return []
}

describe('questions.json', () => {
  it('lists q1–q10 plus the guess interlude after q5, in display order', () => {
    expect(items.map((i) => i.id)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
      'guess',
      'q6',
      'q7',
      'q8',
      'q9',
      'q10',
    ])
  })

  it('has non-empty fi, sv and en text everywhere', () => {
    for (const entry of localized(items))
      for (const l of LANGS) expect(entry[l].trim()).not.toBe('')
  })

  it('gives every statement an after-question card', () => {
    for (const i of scoredItems) if (i.kind === 'statement') expect(i.after).toBeTruthy()
  })

  it('uses the answer UIs of the plan', () => {
    const uis = Object.fromEntries(items.map((i) => [i.id, 'ui' in i ? i.ui : 'slider']))
    expect(uis).toMatchObject({ q1: 'buttons', q2: 'swipe', q3: 'slider', q10: 'imageChoice' })
  })

  it('only flags known locales for review', () => {
    for (const i of items) for (const l of i.needsReview ?? []) expect(LANGS).toContain(l)
  })
})

describe('types.json', () => {
  it('has the six types, each with a representative tree', () => {
    expect(resultTypes.map((r) => r.slug)).toEqual(TYPE_SLUGS)
    for (const r of resultTypes)
      for (const v of Object.values(r.representative)) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('has non-empty fi, sv and en text everywhere', () => {
    for (const entry of localized(resultTypes))
      for (const l of LANGS) expect(entry[l].trim()).not.toBe('')
  })
})

describe('ui.json', () => {
  it('fills placeholders', () => {
    expect(t('en', 'progress.label', { n: 3, total: 10 })).toBe('Question 3 of 10')
    expect(t('fi', 'result.shareText', { percent: 82 })).toBe(
      'Olen 82 % markkinavihreä. Entä sinä?',
    )
  })

  it('throws on unknown keys', () => {
    expect(() => t('fi', 'nope')).toThrow()
  })
})
