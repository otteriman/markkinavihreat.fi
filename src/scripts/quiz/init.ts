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
import { computeResult } from '../../lib/quiz/scoring'
import { swipeValue } from '../../lib/quiz/swipe'
import type { Answers } from '../../lib/quiz/types'
import { encodeAnswersHash, encodeScores, parseChallenger, resultPath } from '../../lib/quiz/url'

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
  }
}

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
  const progress = document.getElementById('quiz-progress')!
  const progressBar = document.getElementById('quiz-progress-bar')!

  const currentId = () => {
    const step = steps[index]
    return step.kind === 'intro' ? null : step.id
  }

  function show(key: string, focus: boolean) {
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
    if (step.kind === 'after' && step.id === 'guess') renderGuessResult()

    progress.classList.toggle('hidden', step.kind === 'intro')
    if (step.kind !== 'intro') {
      const n = questionNumber(items, step.id)
      if (n !== null) progressBar.style.width = `${(n / config.total) * 100}%`
      if (step.kind === 'question' && n !== null) {
        status.textContent = config.strings.progress.replace('{n}', String(n))
      }
    }
    show(stepKey(step), focus)
  }

  function finish() {
    const result = computeResult(answers, scoredItems)
    // A friend's scores (from a challenge link) ride along to the result page.
    const friend = parseChallenger(location.search)
    // replace, so Back from the result page leaves the quiz instead of re-opening q10.
    location.replace(
      localePath(config.locale, resultPath(result.type, result.bucket)) +
        encodeScores(result.scores, friend) +
        encodeAnswersHash(statementValues(items, answers)),
    )
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
    const target = (event.target as Element).closest<HTMLElement>(
      '[data-action],[data-answer],[data-option]',
    )
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
