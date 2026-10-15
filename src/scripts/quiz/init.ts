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
import { swipeValue } from '../../lib/quiz/swipe'
import { TreeView } from '../../lib/quiz/treeView'
import type { Answers, Statement } from '../../lib/quiz/types'
import { encodeAnswersHash, encodeScores, parseChallenger, resultPath } from '../../lib/quiz/url'
import { runReveal } from './reveal'

interface Config {
  locale: Locale
  total: number
  scale: string[]
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
}

/** How long an after-question card stays before moving on (plan: about 1.5 s). */
const CARD_MS = 1500
/** Facts get a little reading time on top, up to 6 s. */
const factMs = (text: string) => Math.min(6000, CARD_MS + text.length * 35)
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

  let autoTimer = 0
  let guessRun = 0

  const currentId = () => {
    const step = steps[index]
    return step.kind === 'intro' ? null : step.id
  }

  // When the current screen appeared. A tap or key right after that belongs to
  // the previous screen (the click that ends a swipe, a double tap) and must not
  // skip the card that just appeared.
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
    const slider = section.querySelector<HTMLInputElement>('[data-slider]')
    if (slider) {
      slider.value = typeof value === 'number' ? String(value) : slider.defaultValue
      updateSliderLabel(section, slider)
    }
    const guessSlider = section.querySelector<HTMLInputElement>('[data-guess-slider]')
    if (guessSlider) {
      guessSlider.value = guess === null ? guessSlider.defaultValue : String(guess)
      section.querySelector('[data-guess-value]')!.textContent = guessSlider.value
    }
  }

  function updateSliderLabel(section: HTMLElement, slider: HTMLInputElement) {
    const label = section.querySelector('[data-slider-label]')
    if (label) label.textContent = config.scale[Number(slider.value) + 2]
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

  /**
   * After-question cards move on by themselves (plan section 7.3): a draining
   * line shows the time left; tapping or pressing a key skips; a focused source
   * link holds the card. With reduced motion they wait for Continue.
   */
  function scheduleCard(step: Step) {
    if (step.kind !== 'after' || step.id === 'guess' || reduceMotion.matches) return
    const item = items.find((i) => i.id === step.id) as Statement
    const ms = item.after.type === 'fact' ? factMs(item.after.text[config.locale]) : CARD_MS
    const section = sections.get(stepKey(step))!
    const bar = section.querySelector<HTMLElement>('[data-timer]')
    if (bar) {
      bar.style.transition = 'none'
      bar.style.transform = 'scaleX(1)'
      void bar.offsetWidth // restart the transition
      bar.style.transition = `transform ${ms}ms linear`
      bar.style.transform = 'scaleX(0)'
    }
    const at = index
    const tick = () => {
      if (index !== at) return
      if (section.contains(document.activeElement) && document.activeElement?.matches('a')) {
        autoTimer = window.setTimeout(tick, 800)
        return
      }
      advance()
    }
    autoTimer = window.setTimeout(tick, ms)
  }

  function go(i: number, focus = true) {
    clearTimeout(autoTimer)
    index = i
    const step = steps[i]
    if (step.kind === 'question') restore(step.id)
    if (step.kind === 'after' && step.id === 'guess') playGuessReveal()

    treeWrap.classList.toggle('is-intro', step.kind === 'intro')
    if (step.kind === 'question') {
      const n = questionNumber(items, step.id)
      if (n !== null) status.textContent = config.strings.progress.replace('{n}', String(n))
    }
    updateTree()
    show(stepKey(step), focus)
    scheduleCard(step)
  }

  let finishing = false
  async function finish() {
    if (finishing) return
    finishing = true
    clearTimeout(autoTimer)
    const result = computeResult(answers, scoredItems)
    // A friend's scores (from a challenge link) ride along to the result page.
    const friend = parseChallenger(location.search)
    const url =
      localePath(config.locale, resultPath(result.type, result.bucket)) +
      encodeScores(result.scores, friend) +
      encodeAnswersHash(statementValues(items, answers))
    const section = sections.get('reveal')!
    section.querySelector<HTMLAnchorElement>('[data-reveal-link]')!.href = url
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
        const slider = section.querySelector<HTMLInputElement>('[data-slider]')
        return answer(slider ? Number(slider.value) : 0)
      }
    }
  })

  // Any key on an after-question card moves on, unless it is meant for a
  // control (Tab to move focus, Enter on a link or button).
  document.addEventListener('keydown', (event) => {
    const step = steps[index]
    // defaultPrevented: the key was already used, e.g. an arrow key answering a swipe card.
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
    if (el.matches('[data-slider]')) updateSliderLabel(section, el)
    if (el.matches('[data-guess-slider]')) {
      section.querySelector('[data-guess-value]')!.textContent = el.value
    }
  })

  // Swipe cards: right = agree, left = disagree; short = ±1, long = ±2. The five
  // buttons under each card are the non-gesture alternative; arrow keys also work.
  root.querySelectorAll<HTMLElement>('[data-swipe]').forEach((card) => {
    let startX = 0
    let dx = 0
    let dragging = false

    card.addEventListener('pointerdown', (e) => {
      dragging = true
      startX = e.clientX
      dx = 0
      card.setPointerCapture(e.pointerId)
      card.style.transition = 'none'
    })
    card.addEventListener('pointermove', (e) => {
      if (!dragging) return
      dx = e.clientX - startX
      card.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`
    })
    const release = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      card.style.transition = reduceMotion.matches ? 'none' : 'transform 0.2s'
      card.style.transform = ''
      const value = e.type === 'pointerup' ? swipeValue(dx, card.offsetWidth) : null
      if (value !== null) answer(value)
    }
    card.addEventListener('pointerup', release)
    card.addEventListener('pointercancel', release)
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const strength = e.shiftKey ? 2 : 1
      answer(e.key === 'ArrowRight' ? strength : -strength)
    })
  })

  go(0, false)
}
