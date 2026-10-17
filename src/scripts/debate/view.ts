import type { Locale } from '../../lib/content'
import type { Side } from '../../lib/debate/battle'
import type { PromptEvent, Step } from '../../lib/debate/playback'
import { format, localize } from '../../lib/debate/text'
import type { Difficulty, UiStrings } from '../../lib/debate/types'
import type { Sounds } from './audio'

/**
 * The stage's DOM (rendered by DebateGame.astro) and everything the battle
 * does to it: typing text, waiting for the player, draining bars, the option
 * grids and the end screen. All listeners are tied to the battle's
 * AbortSignal, so aborting tears everything down mid-battle.
 */
export interface ViewOptions {
  locale: Locale
  ui: UiStrings
  /** Instant text and no hit flash. */
  reduce: boolean
  msPerChar: number
  signal: AbortSignal
  sounds: Sounds
}

type Box = 'top' | 'bottom'

const ADVANCE_KEYS = new Set(['Enter', ' '])
const PROMPT_PAUSE_MS = 450
/**
 * A grid ignores picks this soon after it appears, so a tap or Enter meant
 * to skip text can't pick whatever option the cursor starts on.
 */
const GRID_GRACE_MS = 300
const END_GRACE_MS = 800
/** Matches the .debate-flash animation: 3 × 333 ms, within WCAG's three flashes a second. */
const FLASH_MS = 1000
/** Match the .debate-exit and .debate-enter animations. */
const EXIT_MS = 900
const ENTER_MS = 800
/** Matches the .debate-iris animation, then a moment of darkness. */
const IRIS_MS = 1200
const IRIS_HOLD_MS = 400

/** Hides both sprites (off stage) until a battle's entrance. */
export function hideSprites(root: ParentNode): void {
  root.querySelectorAll('.debate-sprite').forEach((s) => {
    s.classList.remove('debate-exit', 'debate-enter')
    s.classList.add('debate-offstage')
  })
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(id), reject(signal.reason)), {
      once: true,
    })
  })

export class StageView {
  private stage: HTMLElement
  private texts: Record<Box, HTMLElement>
  private more: Record<Box, HTMLElement>
  private tags: Record<Box, HTMLElement>
  private options: HTMLElement
  private live: HTMLElement
  private end: HTMLElement
  private max: Record<Side, number> = { player: 100, enemy: 100 }
  private lastBox: Box = 'bottom'

  constructor(
    private root: HTMLElement,
    private opts: ViewOptions,
  ) {
    const q = <T extends HTMLElement>(sel: string) => {
      const el = root.querySelector<T>(sel)
      if (!el) throw new Error(`Debate stage is missing ${sel}`)
      return el
    }
    this.stage = q('.debate-stage')
    this.texts = { top: q('[data-debate-top]'), bottom: q('[data-debate-bottom]') }
    this.more = { top: q('[data-debate-more="top"]'), bottom: q('[data-debate-more="bottom"]') }
    this.tags = { top: q('[data-debate-tag="top"]'), bottom: q('[data-debate-tag="bottom"]') }
    this.options = q('[data-debate-options]')
    this.live = q('[data-debate-live]')
    this.end = q('[data-debate-end]')
  }

  private t(key: string, vars?: Record<string, number>) {
    return format({ key, vars }, this.opts.locale, this.opts.ui)
  }

  /** Back to the start of a battle: full bars, empty boxes. */
  reset(difficulty: Difficulty): void {
    this.max = { player: difficulty.player.kannatus, enemy: difficulty.enemy.kannatus }
    this.setKannatus('player', this.max.player)
    this.setKannatus('enemy', this.max.enemy)
    this.texts.top.textContent = ''
    this.texts.bottom.textContent = ''
    this.texts.bottom.hidden = false
    this.options.hidden = true
    this.options.replaceChildren()
    this.end.hidden = true
    const iris = this.root.querySelector<HTMLElement>('[data-debate-iris]')
    if (iris) {
      iris.hidden = true
      iris.classList.remove('debate-closing')
    }
    this.more.top.hidden = true
    this.more.bottom.hidden = true
    this.setTags({ kind: 'tags', top: null, bottom: null })
    // Off stage until the battle's entrance (enter()).
    hideSprites(this.root)
    this.stage.tabIndex = 0
    this.stage.focus({ preventScroll: true })
  }

  announce(text: string, append = false): void {
    this.live.textContent =
      append && this.live.textContent ? `${this.live.textContent} ${text}` : text
  }

  /**
   * Calls `handler` on every tap/click on the stage (outside buttons) and on
   * Enter or Space while the stage itself has focus, until `signal` aborts.
   */
  private onAdvance(handler: () => void, signal: AbortSignal) {
    const outsideButton = (e: Event) => !(e.target as Element).closest('button')
    this.stage.addEventListener('click', (e) => outsideButton(e) && handler(), { signal })
    this.stage.addEventListener(
      'keydown',
      (e) => {
        if (!ADVANCE_KEYS.has(e.key) || e.repeat || !outsideButton(e)) return
        e.preventDefault()
        handler()
      },
      { signal },
    )
  }

  /** Waits for one advance (tap, click, Enter or Space), showing the ▼ cue. */
  waitForAdvance(): Promise<void> {
    const { signal } = this.opts
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const local = new AbortController()
      const cue = this.more[this.lastBox]
      cue.hidden = false
      const finish = () => {
        local.abort()
        cue.hidden = true
      }
      this.onAdvance(() => (finish(), resolve()), local.signal)
      signal.addEventListener('abort', () => (finish(), reject(signal.reason)), {
        signal: local.signal,
      })
    })
  }

  pause(): Promise<void> {
    return sleep(PROMPT_PAUSE_MS, this.opts.signal)
  }

  /** Sets or clears the phase labels on the boxes' top edges. */
  setTags(step: Extract<Step, { kind: 'tags' }>): void {
    for (const box of ['top', 'bottom'] as const) {
      const value = step[box]
      if (value === undefined) continue
      this.tags[box].textContent = value ?? ''
      this.tags[box].hidden = !value
    }
    if (step.announce) this.announce(step.announce)
  }

  /** Empties a box. Boxes stay on screen empty: the HP areas hang from them. */
  clear(box: Box): void {
    this.texts[box].textContent = ''
    this.more[box].hidden = true
  }

  /** Types `text` into a box letter by letter; a tap or key press shows it all at once. */
  type(step: Extract<Step, { kind: 'type' }>): Promise<void> {
    const { signal, reduce, msPerChar } = this.opts
    const { box, text } = step
    if (box === 'bottom') {
      this.options.hidden = true
      this.texts.bottom.hidden = false
    }
    this.lastBox = box
    this.announce(step.announce)
    const el = this.texts[box]
    if (reduce || msPerChar <= 0) {
      el.textContent = text
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const local = new AbortController()
      let shown = 0
      el.textContent = ''
      const done = () => {
        clearInterval(timer)
        local.abort()
        el.textContent = text
      }
      const timer = setInterval(() => {
        shown += 1
        el.textContent = text.slice(0, shown)
        if (text[shown - 1] !== ' ') this.opts.sounds.blip()
        if (shown >= text.length) {
          done()
          resolve()
        }
      }, msPerChar)
      this.onAdvance(() => (done(), resolve()), local.signal)
      signal.addEventListener('abort', () => (done(), reject(signal.reason)), {
        signal: local.signal,
      })
    })
  }

  private setKannatus(side: Side, value: number) {
    const number = this.root.querySelector<HTMLElement>(`[data-debate-kannatus="${side}"]`)
    const bar = this.root.querySelector<HTMLElement>(`[data-debate-bar="${side}"]`)
    if (number) number.textContent = String(value)
    bar?.style.setProperty('--fill', String(Math.max(0, value) / this.max[side]))
  }

  /**
   * The hit: the target's avatar flashes (fully transparent, fully opaque,
   * three times in about a second) while its bar drains point by point.
   */
  async hit(step: Extract<Step, { kind: 'hit' }>): Promise<void> {
    const { signal, reduce } = this.opts
    this.announce(step.announce, true)
    if (step.damage <= 0) return
    this.opts.sounds.hit(step.backfire)
    if (reduce) {
      this.setKannatus(step.target, step.to)
      return
    }
    const sprite = this.root.querySelector<HTMLElement>(`.debate-sprite-${step.target}`)
    sprite?.classList.add('debate-flash')
    const drain = async () => {
      const perPoint = Math.max(12, Math.min(30, 600 / step.damage))
      for (let value = step.from - 1; value >= step.to; value--) {
        this.setKannatus(step.target, value)
        await sleep(perPoint, signal)
      }
    }
    try {
      await Promise.all([sleep(FLASH_MS, signal), drain()])
    } finally {
      sprite?.classList.remove('debate-flash')
    }
  }

  /** Both sides slide onto the stage from their own edge (instantly there with reduced motion). */
  async enter(): Promise<void> {
    const sprites = this.root.querySelectorAll<HTMLElement>('.debate-sprite')
    sprites.forEach((s) => {
      s.classList.remove('debate-offstage')
      if (!this.opts.reduce) s.classList.add('debate-enter')
    })
    if (this.opts.reduce) return
    try {
      await sleep(ENTER_MS, this.opts.signal)
    } finally {
      sprites.forEach((s) => s.classList.remove('debate-enter'))
    }
  }

  /**
   * Losing: the screen goes dark in a circle closing from the edges to the
   * middle, holds a moment, and the end screen follows. Skipped with reduced
   * motion.
   */
  async irisOut(): Promise<void> {
    const iris = this.root.querySelector<HTMLElement>('[data-debate-iris]')
    if (!iris || this.opts.reduce) return
    this.more.bottom.hidden = true
    iris.hidden = false
    iris.classList.add('debate-closing')
    await sleep(IRIS_MS + IRIS_HOLD_MS, this.opts.signal)
  }

  /** `who` slides off the stage (instantly gone with reduced motion). */
  async exit(who: Side): Promise<void> {
    this.root.querySelector(`.debate-sprite-${who}`)?.classList.add('debate-exit')
    if (who === 'enemy') this.opts.sounds.win()
    if (!this.opts.reduce) await sleep(EXIT_MS, this.opts.signal)
  }

  /**
   * Shows the option grid (2×2 replies, 2×3 attacks) and resolves with the
   * reply index or attack id the player picks. Arrow keys move the cursor,
   * Enter, Space, a click or a tap picks. Used attacks stay in place, greyed
   * out, and can't be picked.
   */
  choose(prompt: PromptEvent): Promise<number | string> {
    const { signal, locale } = this.opts
    const items =
      prompt.kind === 'reply'
        ? prompt.options.map((o) => ({
            value: o.index as number | string,
            label: o.label,
            used: false,
          }))
        : prompt.options.map((o) => ({
            value: o.id as number | string,
            label: o.label,
            used: o.used,
          }))
    const usedText = this.t('a11y.used')
    const buttons = items.map((item) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'debate-option'
      const label = document.createElement('span')
      label.className = 'debate-option-label'
      label.textContent = localize(item.label, locale)
      button.append(label)
      if (item.used) {
        button.setAttribute('aria-disabled', 'true')
        const note = document.createElement('span')
        note.className = 'sr-only'
        note.textContent = ` (${usedText})`
        button.append(note)
      }
      return button
    })
    this.options.replaceChildren(
      ...buttons.map((b) => {
        const li = document.createElement('li')
        li.append(b)
        return li
      }),
    )
    this.texts.bottom.hidden = true
    this.more.bottom.hidden = true
    this.options.hidden = false

    const shownAt = performance.now()
    let current = Math.max(
      0,
      items.findIndex((i) => !i.used),
    )
    const select = (index: number, focus = true) => {
      if (index !== current) this.opts.sounds.move()
      current = index
      buttons.forEach((b, i) => {
        b.tabIndex = i === index ? 0 : -1
        if (i === index) b.setAttribute('aria-current', 'true')
        else b.removeAttribute('aria-current')
      })
      if (focus) buttons[index].focus({ preventScroll: true })
    }
    select(current)

    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const local = new AbortController()
      const opts = { signal: local.signal }
      const finish = () => {
        local.abort()
        this.options.hidden = true
        this.texts.bottom.hidden = false
        this.stage.focus({ preventScroll: true })
      }
      this.options.addEventListener(
        'keydown',
        (e) => {
          const n = buttons.length
          const moves: Record<string, number> = {
            ArrowLeft: current % 2 === 1 ? current - 1 : current,
            ArrowRight: current % 2 === 0 && current + 1 < n ? current + 1 : current,
            ArrowUp: current - 2 >= 0 ? current - 2 : current,
            ArrowDown: current + 2 < n ? current + 2 : current,
          }
          if (!(e.key in moves)) return
          e.preventDefault()
          select(moves[e.key])
        },
        opts,
      )
      buttons.forEach((button, i) => {
        button.addEventListener(
          'pointerenter',
          (e) => e.pointerType === 'mouse' && select(i, false),
          opts,
        )
        button.addEventListener(
          'click',
          () => {
            if (performance.now() - shownAt < GRID_GRACE_MS) return
            if (items[i].used) {
              select(i)
              this.announce(`${localize(items[i].label, locale)}: ${usedText}`)
              return
            }
            this.opts.sounds.select()
            finish()
            resolve(items[i].value)
          },
          opts,
        )
      })
      signal.addEventListener('abort', () => (finish(), reject(signal.reason)), opts)
    })
  }

  /** The end screen: the result, the strong-reply count and "Play again". */
  showEnd(step: Extract<Step, { kind: 'end' }>): Promise<void> {
    const { signal } = this.opts
    const strong = this.t('end.strongReplies', {
      count: step.result.strongReplies,
      total: step.result.repliesGiven,
    })
    this.end.querySelector('[data-debate-end-result]')!.textContent = step.text
    this.end.querySelector('[data-debate-end-strong]')!.textContent = strong
    this.end.dataset.result = step.result.kind
    this.end.hidden = false
    this.announce(`${step.text} ${strong}`)
    const again = this.end.querySelector<HTMLButtonElement>('[data-debate-again]')!
    again.focus({ preventScroll: true })
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const local = new AbortController()
      const shownAt = performance.now()
      again.addEventListener(
        'click',
        () => {
          // A longer grace than the grids': the result is worth a look.
          if (performance.now() - shownAt < END_GRACE_MS) return
          local.abort()
          resolve()
        },
        { signal: local.signal },
      )
      signal.addEventListener('abort', () => (local.abort(), reject(signal.reason)), {
        signal: local.signal,
      })
    })
  }
}
