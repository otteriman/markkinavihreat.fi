export type Lang = 'fi' | 'sv' | 'en'
export const LANGS: Lang[] = ['fi', 'sv', 'en']

export type Axis = 'markets' | 'environment' | 'freedom'
export const AXES: Axis[] = ['markets', 'environment', 'freedom']

/** Statements are answered with five buttons; the finale with illustrated cards. */
export type AnswerUI = 'buttons' | 'imageChoice'

export type Localized = Record<Lang, string>

/**
 * Locales whose strings in an entry were machine-drafted and still wait for a
 * human check. Finnish is the source of truth, so it is never listed there
 * except for strings drafted from the plan's notes.
 */
export interface Reviewable {
  needsReview?: Lang[]
}

export type AfterCard =
  | { type: 'fact'; text: Localized; source: { label: string; url: string } | 'TODO' }
  | { type: 'reaction'; text: Localized }
  | { type: 'teaser'; text: Localized }

export interface Statement extends Reviewable {
  id: string // 'q1' … 'q9'
  kind: 'statement'
  axis: Axis
  /** +1: agreeing raises the axis score; -1: agreeing lowers it. */
  direction: 1 | -1
  ui: Exclude<AnswerUI, 'imageChoice'>
  text: Localized
  after: AfterCard
  relatedLink?: { href: Localized; label: Localized }
}

export interface FinaleOption extends Reviewable {
  id: string
  label: Localized
  markets: number
  environment: number
}

export interface Finale extends Reviewable {
  id: 'q10'
  kind: 'finale'
  ui: 'imageChoice'
  text: Localized
  options: FinaleOption[]
}

export interface GuessInterlude extends Reviewable {
  id: 'guess'
  kind: 'guess' // not scored
  after: string // id of the question it follows
  text: Localized
  min: number
  max: number
  answer: number
  reveal: Localized
}

export type QuizItem = Statement | Finale | GuessInterlude
/** Items that contribute to the score. */
export type ScoredItem = Statement | Finale

export type TypeSlug = 'pigou' | 'liberal' | 'ecologist' | 'engineer' | 'focused' | 'free'
export const TYPE_SLUGS: TypeSlug[] = [
  'pigou',
  'liberal',
  'ecologist',
  'engineer',
  'focused',
  'free',
]

export type Scores = Record<Axis, number>

export interface ResultType extends Reviewable {
  slug: TypeSlug
  name: Localized
  oneLiner: Localized
  description: Localized
  /** Scores used to draw the type's representative tree (plan section 7.4). */
  representative: Scores
}

/**
 * Raw answers keyed by item id. Statements: -2…+2 (before direction).
 * Finale: the chosen option id. `null` means skipped and counts as 0.
 * A missing key means "not reached yet".
 */
export type Answers = Record<string, number | string | null>

export interface UiEntry extends Reviewable {
  fi: string
  sv: string
  en: string
}
