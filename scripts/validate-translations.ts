import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

// Quiz data (src/data/quiz/*.json): every localized string needs fi + sv + en.
// "TODO" placeholders and `needsReview` drafts are allowed but reported, so
// open items stay visible without failing the build.
const QUIZ_DIR = join(process.cwd(), 'src/data/quiz')
let quizTodos = 0
let quizReview = 0

function checkQuiz(value: unknown, where: string) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkQuiz(v, `${where}[${i}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  const present = LOCALES.filter((l) => l in obj)
  if (present.length > 0 && present.every((l) => typeof obj[l] === 'string')) {
    const missing = LOCALES.filter((l) => !(l in obj) || String(obj[l]).trim() === '')
    if (missing.length > 0) {
      console.error(`[quiz] ${where} is missing: ${missing.join(', ')}`)
      hasError = true
    }
    if (LOCALES.some((l) => String(obj[l]).startsWith('TODO'))) quizTodos++
    if (Array.isArray(obj.needsReview) && obj.needsReview.length > 0) quizReview++
    return
  }
  if (Array.isArray(obj.needsReview) && obj.needsReview.length > 0) quizReview++
  for (const [key, child] of Object.entries(obj)) {
    if (key !== 'needsReview') checkQuiz(child, `${where}.${key}`)
  }
}

for (const file of readdirSync(QUIZ_DIR).filter((f) => f.endsWith('.json'))) {
  checkQuiz(JSON.parse(readFileSync(join(QUIZ_DIR, file), 'utf-8')), file)
}

if (hasError) {
  console.error('\nTranslation parity check failed.')
  process.exit(1)
} else {
  console.log('Translation parity check passed: every entry has fi/sv/en.')
  if (quizTodos > 0) console.log(`Quiz: ${quizTodos} string(s) still marked TODO.`)
  if (quizReview > 0) console.log(`Quiz: ${quizReview} entr(ies) flagged needsReview.`)
}
