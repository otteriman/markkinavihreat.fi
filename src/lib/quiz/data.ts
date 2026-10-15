import questionsJson from '../../data/quiz/questions.json'
import typesJson from '../../data/quiz/types.json'
import uiJson from '../../data/quiz/ui.json'
import type { Lang, QuizItem, ResultType, ScoredItem, UiEntry } from './types'

// The JSON is checked against these types by tests/unit/quiz-data.test.ts and
// scripts/validate-translations.ts. It is cast here rather than parsed with zod
// so the validator never ships in the quiz's client bundle.
export const items = questionsJson.items as unknown as QuizItem[]
export const scoredItems = items.filter((i): i is ScoredItem => i.kind !== 'guess')
export const resultTypes = typesJson.types as unknown as ResultType[]
const ui = uiJson as unknown as Record<string, UiEntry>

/** UI string by key, with `{name}` placeholders filled from `vars`. */
export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const entry = ui[key]
  if (!entry) throw new Error(`Unknown quiz UI key "${key}"`)
  return entry[lang].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
}
