import type { Answers, QuizItem } from './types'

/**
 * Screens of the quiz in display order (plan section 7.1):
 * intro → q1 → after q1 → … → guess → guess reveal → … → q10.
 * The finale has no after-card; the quiz ends there.
 */
export type Step =
  { kind: 'intro' } | { kind: 'question'; id: string } | { kind: 'after'; id: string }

export function buildSteps(items: QuizItem[]): Step[] {
  const steps: Step[] = [{ kind: 'intro' }]
  for (const item of items) {
    steps.push({ kind: 'question', id: item.id })
    if (item.kind !== 'finale') steps.push({ kind: 'after', id: item.id })
  }
  return steps
}

/** 1-based position among the scored questions; null for the guess interlude. */
export function questionNumber(items: QuizItem[], id: string): number | null {
  const scored = items.filter((i) => i.kind !== 'guess')
  const index = scored.findIndex((i) => i.id === id)
  return index === -1 ? null : index + 1
}

export const scoredCount = (items: QuizItem[]) => items.filter((i) => i.kind !== 'guess').length

/** Index of the step after `index`, or null at the end of the quiz. */
export function nextStep(steps: Step[], index: number): number | null {
  return index + 1 < steps.length ? index + 1 : null
}

/**
 * Index of the step before `index`. Back never lands on an after-card: from a
 * question it goes to the previous question, from an after-card to its own
 * question. Null when there is nothing before (the intro).
 */
export function previousStep(steps: Step[], index: number): number | null {
  for (let i = index - 1; i >= 0; i--) {
    if (steps[i].kind !== 'after') return i
  }
  return null
}

/** Raw statement answers in question order, for the `#a=` hash. Unanswered = skipped = null. */
export function statementValues(items: QuizItem[], answers: Answers): (number | null)[] {
  return items
    .filter((i) => i.kind === 'statement')
    .map((i) => (typeof answers[i.id] === 'number' ? (answers[i.id] as number) : null))
}
