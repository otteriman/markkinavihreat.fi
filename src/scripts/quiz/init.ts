import { localePath, type Locale } from '../../lib/content'
import { items, scoredItems } from '../../lib/quiz/data'
import {
  buildSteps,
  nextStep,
  previousStep,
  questionNumber,
  statementValues,
  type Step,
} from '../../lib/quiz/flow'
import { computeResult, runningScores } from '../../lib/quiz/scoring'
import { TreeView } from '../../lib/quiz/treeView'
import type { Answers, Statement } from '../../lib/quiz/types'
import { encodeAnswersHash, encodeScores, parseChallenger, resultPath } from '../../lib/quiz/url'
import { runReveal } from './reveal'

interface Config {
  locale: Locale
  total: number
  guess: number
  strings: {
    progress: string
    guessOff: string
    guessOffOne: string
    guessExact: string
    overall: string
    revealStatus: string
  }
  types: Record<string, string>
  cues: Record<string, { title: string; detail: string }>
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const stepKey = (s: Step) =>
  s.kind === 'intro' ? 'intro' : `${s.kind === 'question' ? 'q' : 'a'}:${s.id}`

/**
 * Drives the quiz page. The markup (question text, cards, labels) is
 * server-rendered by QuizBody.astro; this only switches screens, records answers
 * in memory and scores them. Nothing is stored or sent anywhere.
 */
export function initQuiz() {
  const root = document.getElementById('quiz')
  const configEl = document.getElementById('quiz-config')
  if (!root || !configEl) return
  const config = JSON.parse(configEl.textContent ?? '{}') as Config
  const steps = buildSteps(items)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let index = 0
  let answers: Answers = {}
  let guess: number | null = null

  const sections = new Map<string, HTMLElement>()
  root.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
    sections.set(el.dataset.step!, el)
  })
  const status = document.getElementById('quiz-status')!
  const treeWrap = document.getElementById('quiz-tree-wrap')!

  // The growing tree: one stage per answered (or skipped) scored question, with
  // the traits of the answers so far (plan section 7.5).
  const treeInput = () => ({
    growth: scoredItems.filter((i) => i.id in answers).length / config.total,
    ...runningScores(answers, scoredItems),
  })
  const view = new TreeView(document.getElementById('quiz-tree')!, treeInput())
  let shownTree = JSON.stringify(treeInput())
  function updateTree() {
    const input = treeInput()
    const key = JSON.stringify(input)
    if (key === shownTree) return
    shownTree = key
    void view.set(input)
  }

  let guessRun = 0

  const currentId = () => {
    const step = steps[index]
    return step.kind === 'intro' ? null : step.id
  }

  // When the current screen appeared. A tap or key right after that belongs to
  // the previous screen (the second tap of a double tap, a ghost click on touch
  // screens) and must not skip the card that just appeared.
  let shownAt = 0
  const justShown = () => performance.now() - shownAt < 400

  function show(key: string, focus: boolean) {
    shownAt = performance.now()
    for (const [k, el] of sections) el.hidden = k !== key
    const section = sections.get(key)!
    if (!focus) return
    section.querySelector<HTMLElement>('[data-heading]')?.focus({ preventScroll: true })
    root!.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' })
  }

  function restore(id: string) {
    const section = sections.get(`q:${id}`)!
    const value = answers[id]
    section.querySelectorAll<HTMLElement>('[data-answer]').forEach((b) => {
      b.setAttribute(
        'aria-pressed',
        String(typeof value === 'number' && Number(b.dataset.answer) === value),
      )
    })
    section.querySelectorAll<HTMLElement>('[data-option]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.option === value))
    })
    const guessSlider = section.querySelector<HTMLInputElement>('[data-guess-slider]')
    if (guessSlider) {
      guessSlider.value = guess === null ? guessSlider.defaultValue : String(guess)
      section.querySelector('[data-guess-value]')!.textContent = guessSlider.value
    }
  }

  /** The guess reveal: the slider glides from the guess to the right year. */
  function playGuessReveal() {
    const section = sections.get('a:guess')!
    const slider = section.querySelector<HTMLInputElement>('[data-reveal-slider]')!
    const year = section.querySelector('[data-reveal-year]')!
    section.querySelector('[data-your-guess]')!.textContent = guess === null ? '–' : String(guess)
    section.querySelector('[data-guess-result]')!.textContent = ''
    const run = ++guessRun
    const settle = () => {
      slider.value = String(config.guess)
      year.textContent = String(config.guess)
      renderGuessResult()
    }
    if (guess === null || reduceMotion.matches) return settle()
    const from = guess
    const start = performance.now()
    const frame = (now: number) => {
      if (run !== guessRun) return
      const t = Math.min(1, (now - start) / 1000)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const value = Math.round(from + (config.guess - from) * eased)
      slider.value = String(value)
      year.textContent = String(value)
      if (t < 1) requestAnimationFrame(frame)
      else settle()
    }
    slider.value = String(from)
    year.textContent = String(from)
    requestAnimationFrame(frame)
  }

  function renderGuessResult() {
    const el = sections.get('a:guess')!.querySelector('[data-guess-result]')!
    if (guess === null) return void (el.textContent = '')
    const off = Math.abs(guess - config.guess)
    el.textContent =
      off === 0
        ? config.strings.guessExact
        : off === 1
          ? config.strings.guessOffOne
          : config.strings.guessOff.replace('{n}', String(off))
  }

  function go(i: number, focus = true) {
    index = i
    const step = steps[i]
    if (step.kind === 'question') restore(step.id)
    if (step.kind === 'after' && step.id === 'guess') playGuessReveal()

    // The tree is shown on the intro and after each answer, never next to a
    // question, so the answers fit on a phone screen without scrolling.
    const afterStatement = step.kind === 'after' && step.id !== 'guess'
    treeWrap.classList.toggle('hidden', step.kind !== 'intro' && !afterStatement)
    treeWrap.classList.toggle('is-intro', step.kind === 'intro')
    if (afterStatement) showCue(step.id)
    if (step.kind === 'question') {
      const n = questionNumber(items, step.id)
      if (n !== null) status.textContent = config.strings.progress.replace('{n}', String(n))
    }
    updateTree()
    show(stepKey(step), focus)
  }

  /** Tells which way the answer just given moved the tree, e.g. "More freedom". */
  function showCue(id: string) {
    const item = items.find((i): i is Statement => i.id === id && i.kind === 'statement')
    if (!item) return
    const value = answers[id]
    const push = typeof value === 'number' ? value * item.direction : 0
    const cue =
      config.cues[push > 0 ? `${item.axis}.up` : push < 0 ? `${item.axis}.down` : 'neutral']
    const section = sections.get(`a:${id}`)!
    section.querySelector('[data-cue-title]')!.textContent = cue.title
    section.querySelector('[data-cue-detail]')!.textContent = cue.detail
  }

  let finishing = false
  async function finish() {
    if (finishing) return
    finishing = true
    const result = computeResult(answers, scoredItems)
    // A friend's scores (from a challenge link) ride along to the result page.
    const friend = parseChallenger(location.search)
    const url =
      localePath(config.locale, resultPath(result.type, result.bucket)) +
      encodeScores(result.scores, friend) +
      encodeAnswersHash(statementValues(items, answers))
    const section = sections.get('reveal')!
    section.querySelector<HTMLAnchorElement>('[data-reveal-link]')!.href = url
    treeWrap.classList.remove('hidden')
    show('reveal', true)
    shownTree = ''
    await runReveal(
      {
        section,
        treeWrap,
        view,
        overall: config.strings.overall,
        status: config.strings.revealStatus,
        typeName: config.types[result.type],
      },
      result,
      reduceMotion.matches,
    )
    if (!reduceMotion.matches) await wait(1800)
    // replace, so Back from the result page leaves the quiz instead of re-opening q10.
    location.replace(url)
  }

  function advance() {
    const next = nextStep(steps, index)
    if (next === null) finish()
    else go(next)
  }

  function answer(value: number | string | null) {
    const id = currentId()
    if (!id) return
    answers[id] = value
    advance()
  }

  root.addEventListener('click', (event) => {
    const clicked = event.target as Element
    const link = clicked.closest<HTMLAnchorElement>('[data-reveal-link]')
    if (link) {
      event.preventDefault()
      location.replace(link.href)
      return
    }
    const target = clicked.closest<HTMLElement>('[data-action],[data-answer],[data-option]')
    // Tapping anywhere on an after-question card moves on (links still work).
    const step = steps[index]
    if (!target && step.kind === 'after' && !clicked.closest('a')) {
      if (!justShown() && sections.get(stepKey(step))!.contains(clicked)) advance()
      return
    }
    if (!target || !root.contains(target)) return
    if (target.dataset.answer !== undefined) return answer(Number(target.dataset.answer))
    if (target.dataset.option !== undefined) return answer(target.dataset.option)

    const section = target.closest<HTMLElement>('[data-step]')!
    switch (target.dataset.action) {
      case 'start':
        return go(1)
      case 'continue':
        return advance()
      case 'skip':
        return answer(null)
      case 'back': {
        const prev = previousStep(steps, index)
        return prev === null ? undefined : go(prev)
      }
      case 'next': {
        const guessSlider = section.querySelector<HTMLInputElement>('[data-guess-slider]')
        if (guessSlider) {
          guess = Number(guessSlider.value)
          return advance()
        }
        return answer(0)
      }
    }
  })

  // Any key on an after-question card moves on, unless it is meant for a
  // control (Tab to move focus, Enter on a link or button).
  document.addEventListener('keydown', (event) => {
    const step = steps[index]
    if (step.kind !== 'after' || finishing || event.defaultPrevented || justShown()) return
    if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
    if ((event.target as Element).closest?.('a,button,input')) return
    event.preventDefault()
    advance()
  })

  root.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement
    const section = el.closest<HTMLElement>('[data-step]')
    if (!section) return
    if (el.matches('[data-guess-slider]')) {
      section.querySelector('[data-guess-value]')!.textContent = el.value
    }
  })

  go(0, false)
}
