import { localePath, type Locale } from '../../lib/content'
import { resultFromScores } from '../../lib/quiz/scoring'
import { pickNudges } from '../../lib/quiz/scoring'
import type { Axis, Scores } from '../../lib/quiz/types'
import {
  encodeScores,
  parseAnswersHash,
  parseChallenger,
  parseScores,
  resultPath,
} from '../../lib/quiz/url'
import { items } from '../../lib/quiz/data'

interface Config {
  locale: Locale
  strings: { overall: string; takeAgain: string }
  types: Record<string, { name: string }>
  nudges: Record<string, { href: string; label: string }>
}

const AXES: Axis[] = ['markets', 'environment', 'freedom']

function fillBars(root: ParentNode, group: string, scores: Scores) {
  const bars = root.querySelector(`[data-bars="${group}"]`)
  if (!bars) return
  for (const axis of AXES) {
    const bar = bars.querySelector(`[data-bar="${axis}"]`)!
    bar.querySelector('[data-bar-value]')!.textContent = String(scores[axis])
    bar.querySelector<HTMLElement>('[data-bar-fill]')!.style.width = `${scores[axis]}%`
  }
}

/**
 * Hydrates a static result page from the URL: exact scores from the query
 * string, the friend's scores for the comparison, and the per-question answers
 * from the hash (which never leaves the browser). Nothing here is sent anywhere.
 */
export function initResult() {
  const root = document.getElementById('quiz-result')
  const configEl = document.getElementById('quiz-result-config')
  if (!root || !configEl) return
  const config = JSON.parse(configEl.textContent ?? '{}') as Config
  const { locale } = config

  const scores = parseScores(location.search)
  const friend = scores ? parseChallenger(location.search) : null

  if (scores) {
    const result = resultFromScores(scores)
    // The page is pre-rendered for one type and bucket. If the scores in the URL
    // belong to another (edited or stale link), go to the matching page so the
    // headline, preview image and numbers always agree.
    if (result.type !== root.dataset.type || String(result.bucket) !== root.dataset.bucket) {
      location.replace(
        localePath(locale, resultPath(result.type, result.bucket)) +
          encodeScores(scores, friend) +
          location.hash,
      )
      return
    }

    // Normalise clamped or rounded values in the address bar.
    const clean = encodeScores(scores, friend)
    if (clean !== location.search) history.replaceState(null, '', clean + location.hash)

    root.querySelector('[data-result-percent]')!.textContent = config.strings.overall.replace(
      '{percent}',
      String(result.overall),
    )
    root.querySelector('[data-no-scores]')!.setAttribute('hidden', '')
    root.querySelector('[data-cta-quiz]')!.textContent = config.strings.takeAgain

    if (friend) {
      const mine = result
      const theirs = resultFromScores(friend)
      const summary = (r: typeof mine) =>
        `${config.strings.overall.replace('{percent}', String(r.overall))} · ${config.types[r.type].name}`
      const cards = { you: mine, friend: theirs }
      for (const [who, r] of Object.entries(cards)) {
        const card = root.querySelector(`[data-compare-card="${who}"]`)!
        card.querySelector('[data-compare-summary]')!.textContent = summary(r)
        fillBars(card, `compare-${who}`, r.scores)
      }
      root.querySelector('[data-compare]')!.removeAttribute('hidden')
    } else {
      fillBars(root, 'you', scores)
      root.querySelector('[data-scores]')!.removeAttribute('hidden')
    }

    // Personalised links, from the answers in the hash (never in the query).
    const values = parseAnswersHash(
      location.hash,
      items.filter((i) => i.kind === 'statement').length,
    )
    if (values) {
      const statements = items.filter((i) => i.kind === 'statement')
      const answers = Object.fromEntries(statements.map((s, i) => [s.id, values[i]]))
      const list = root.querySelector('[data-nudge-list]')!
      for (const s of pickNudges(answers)) {
        const link = config.nudges[s.id]
        if (!link) continue
        const a = document.createElement('a')
        a.href = link.href
        a.textContent = link.label
        a.className = 'underline'
        const li = document.createElement('li')
        li.append(a)
        list.append(li)
      }
      if (list.children.length > 0) root.querySelector('[data-nudges]')!.removeAttribute('hidden')
    }

    // Keep the scores when switching language.
    document.querySelectorAll<HTMLAnchorElement>('nav a[href*="/testi/tulos/"]').forEach((a) => {
      a.href += location.search + location.hash
    })
  }
}
