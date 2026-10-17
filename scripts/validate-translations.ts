import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { formatProblem, translationStatus, validateDebate } from '../src/lib/debate/validate'
import { loadDebate } from './debate/load'

const LOCALES = ['fi', 'sv', 'en']
const CONTENT_ROOT = join(process.cwd(), 'src/content')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (entry.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

let hasError = false

for (const collection of readdirSync(CONTENT_ROOT)) {
  const collectionDir = join(CONTENT_ROOT, collection)
  if (!statSync(collectionDir).isDirectory()) continue

  const bySlug = new Map<string, Set<string>>()

  for (const file of walk(collectionDir)) {
    const base = file.slice(collectionDir.length + 1).replace(/\.md$/, '')
    const lastDot = base.lastIndexOf('.')
    if (lastDot === -1) {
      console.error(
        `[${collection}] "${base}.md" has no locale suffix (expected "<slug>.<locale>.md")`,
      )
      hasError = true
      continue
    }
    const slug = base.slice(0, lastDot)
    const locale = base.slice(lastDot + 1)
    if (!LOCALES.includes(locale)) {
      console.error(`[${collection}] "${base}.md" has unknown locale "${locale}"`)
      hasError = true
      continue
    }
    if (!bySlug.has(slug)) bySlug.set(slug, new Set())
    bySlug.get(slug)!.add(locale)
  }

  for (const [slug, locales] of bySlug) {
    const missing = LOCALES.filter((l) => !locales.has(l))
    if (missing.length > 0) {
      console.error(`[${collection}] "${slug}" is missing translations for: ${missing.join(', ')}`)
      hasError = true
    }
  }
}

// Debate game (src/data/debate/): fi + sv + en for every text, plus its
// content rules. TODO and needsReview are reported, not failures.
const debate = loadDebate()
for (const problem of validateDebate(
  debate.config,
  debate.enemies,
  debate.ui,
  debate.problems,
  debate.specials,
)) {
  console.error(`[debate] ${formatProblem(problem)}`)
  hasError = true
}
const debateStatus = translationStatus(debate.files)
const debateReview = Object.entries(debateStatus.review).filter(([, n]) => n > 0)
if (debateStatus.todo.length > 0 || debateReview.length > 0) {
  console.log(
    `[debate] open: ${debateStatus.todo.length} TODO text(s); needsReview ` +
      (debateReview.map(([l, n]) => `${l} ${n}`).join(', ') || 'none') +
      ' (see npm run debate:report)',
  )
}

if (hasError) {
  console.error('\nTranslation parity check failed.')
  process.exit(1)
} else {
  console.log('Translation parity check passed: every entry has fi/sv/en.')
}
