import type { Locale } from '../content'
import type { BattleEvent, BattleResult, Side } from './battle'
import { format, localize } from './text'
import type { Enemy, UiStrings } from './types'

/**
 * Turns the engine's events into steps for the stage to perform: which box a
 * text goes in, what screen readers hear, and when to wait for the player.
 * Pure, so the pacing rules are unit tested without a browser:
 *
 * - Every line waits for a tap or key press before the next one.
 * - An effect text ("Se oli erittäin tehokas!") is followed straight away by
 *   the hit (bar drains), then the wait, as the spec orders.
 * - A prompt ("Miten vastaat?") only pauses briefly before its option grid.
 * - A new round clears the enemy's speech box.
 */
export type Step =
  | {
      kind: 'type'
      box: 'top' | 'bottom'
      text: string
      /** The line as screen readers hear it, with the speaker for spoken lines. */
      announce: string
      clearTop?: boolean
    }
  | { kind: 'wait'; until: 'advance' | 'pause' }
  | {
      kind: 'hit'
      target: Side
      damage: number
      from: number
      to: number
      /** E.g. "Sinä: kannatus 85". */
      announce: string
    }
  | { kind: 'prompt'; prompt: PromptEvent }
  | { kind: 'end'; result: BattleResult; text: string }

export type PromptEvent = Extract<BattleEvent, { type: 'prompt' }>

export function planSteps(
  events: BattleEvent[],
  locale: Locale,
  ui: UiStrings,
  enemy: Enemy,
): Step[] {
  const steps: Step[] = []
  const you = format({ key: 'a11y.you' }, locale, ui)
  const foe = localize(enemy.subject, locale)
  let lastNarration = ''

  events.forEach((event, i) => {
    const next = events[i + 1]
    switch (event.type) {
      case 'narrate': {
        const text = format(event.message, locale, ui)
        const isRound = 'key' in event.message && event.message.key === 'round.start'
        steps.push({ kind: 'type', box: 'bottom', text, announce: text, clearTop: isRound })
        lastNarration = text
        // A hit right after an effect text plays before the wait (the spec's order).
        if (next?.type !== 'hit') {
          steps.push({ kind: 'wait', until: next?.type === 'prompt' ? 'pause' : 'advance' })
        }
        break
      }
      case 'say': {
        const text = localize(event.text, locale)
        const speaker = event.who === 'enemy' ? foe : you
        steps.push({
          kind: 'type',
          box: event.who === 'enemy' ? 'top' : 'bottom',
          text,
          announce: `${speaker}: ${text}`,
        })
        steps.push({ kind: 'wait', until: next?.type === 'prompt' ? 'pause' : 'advance' })
        break
      }
      case 'hit': {
        const name = event.target === 'enemy' ? enemy.subject : ui['a11y.you']
        steps.push({
          kind: 'hit',
          target: event.target,
          damage: event.damage,
          from: event.from,
          to: event.to,
          announce: format({ key: 'a11y.hit', vars: { name, value: event.to } }, locale, ui),
        })
        if (events[i - 1]?.type === 'narrate') steps.push({ kind: 'wait', until: 'advance' })
        break
      }
      case 'prompt':
        steps.push({ kind: 'prompt', prompt: event })
        break
      case 'end':
        steps.push({ kind: 'end', result: event.result, text: lastNarration })
        break
    }
  })
  return steps
}
