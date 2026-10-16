import { describe, expect, it } from 'vitest'
import { items } from '../../src/lib/quiz/data'
import {
  BONUS_AFTER,
  buildSteps,
  nextStep,
  previousStep,
  questionNumber,
  scoredCount,
  statementValues,
} from '../../src/lib/quiz/flow'

const steps = buildSteps(items)
const at = (kind: string, id?: string) =>
  steps.findIndex((s) => s.kind === kind && (id === undefined || ('id' in s && s.id === id)))

describe('buildSteps', () => {
  it('starts with the intro and ends with the finale question', () => {
    expect(steps[0]).toEqual({ kind: 'intro' })
    expect(steps.at(-1)).toEqual({ kind: 'question', id: 'q10' })
  })

  it('follows every question except the finale with an after step', () => {
    expect(steps.slice(1, 5)).toEqual([
      { kind: 'question', id: 'q1' },
      { kind: 'after', id: 'q1' },
      { kind: 'question', id: 'q2' },
      { kind: 'after', id: 'q2' },
    ])
    expect(steps.filter((s) => s.kind === 'after')).toHaveLength(10) // q1–q9 + guess reveal
  })

  it('puts the guess between q5 and q6', () => {
    const order = steps.filter((s) => s.kind === 'question').map((s) => 'id' in s && s.id)
    expect(order).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'guess', 'q6', 'q7', 'q8', 'q9', 'q10'])
  })
})

describe('questionNumber', () => {
  it('numbers scored questions 1–10 and skips the guess', () => {
    expect(scoredCount(items)).toBe(10)
    expect(questionNumber(items, 'q5')).toBe(5)
    expect(questionNumber(items, 'q6')).toBe(6)
    expect(questionNumber(items, 'q10')).toBe(10)
    expect(questionNumber(items, 'guess')).toBeNull()
  })
})

describe('navigation', () => {
  it('moves forward one step and stops at the end', () => {
    expect(nextStep(steps, 0)).toBe(1)
    expect(nextStep(steps, steps.length - 1)).toBeNull()
  })

  it('goes back from a question to the previous question, skipping after-cards', () => {
    expect(previousStep(steps, at('question', 'q2'))).toBe(at('question', 'q1'))
    expect(previousStep(steps, at('question', 'q6'))).toBe(at('question', 'guess'))
  })

  it('goes back from an after-card to its own question', () => {
    expect(previousStep(steps, at('after', 'q3'))).toBe(at('question', 'q3'))
  })

  it('goes back from q1 to the intro, and has nothing before the intro', () => {
    expect(previousStep(steps, at('question', 'q1'))).toBe(0)
    expect(previousStep(steps, 0)).toBeNull()
  })
})

describe('statementValues', () => {
  it('lists q1–q9 in order with skipped and unanswered as null', () => {
    const values = statementValues(items, { q1: 2, q2: -1, q3: null, q9: 1, q10: 'price' })
    expect(values).toEqual([2, -1, null, null, null, null, null, null, 1])
  })
})

describe('bonus level', () => {
  const bonus = steps.findIndex((s) => s.kind === 'bonus')

  it('comes once, right after the third question and its after-screen', () => {
    expect(BONUS_AFTER).toBe('q3')
    expect(steps.filter((s) => s.kind === 'bonus')).toHaveLength(1)
    expect(steps[bonus - 1]).toEqual({ kind: 'after', id: 'q3' })
    expect(steps[bonus + 1]).toEqual({ kind: 'question', id: 'q4' })
  })

  it('is skipped by Back: from q4 back to q3', () => {
    expect(previousStep(steps, at('question', 'q4'))).toBe(at('question', 'q3'))
  })

  it('does not count as a question', () => {
    expect(questionNumber(items, 'q4')).toBe(4)
  })
})
