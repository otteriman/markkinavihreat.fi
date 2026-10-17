import type { Locale } from '../content'
import type { BattleEvent, BattleResult, Side } from './battle'
import { format, localize } from './text'
import type { Enemy, PresentationOptions, UiStrings } from './types'

/**
 * Turns the engine's events into steps for the stage to perform: which box a
 * text goes in, what screen readers hear, and when to wait for the player.
 * Pure, so the pacing rules are unit tested without a browser:
 *
 * - Every line waits for a tap or key press before the next one.
 * - An effect text ("Hyökkäyksesi oli erittäin tehokas!") is followed straight away by
 *   the hit (bar drains), then the wait, as the spec orders.
 * - Each box has a phase label on its top edge. The enemy's shows his move
 *   ("Hyökkäys: Velkapaniikki", "Puolustus"); the bottom one shows the
 *   player's ("Vastaus: Veroparatiisit", "Hyökkäys: Huoltovarmuus").
 * - A prompt ("Millä teemalla vastaat?") isn't typed: it becomes the bottom
 *   label over the option grid, which appears at once.
 * - The enemy's box empties (text and label) when a new round starts and when
 *   the player attacks, so it never shows a line he has finished with.
 * - A new round and the ending clear both labels. Rounds aren't announced.
 * - With presentation.announceTurns, a line says whose turn it is as each
 *   side's attack begins ("Kansalliskonservatiivi vaihtaa puheenaihetta.",
 *   "Sinun vuorosi valita puheenaihe."); the player's clears his box and
 *   the labels first.
 * - Both sides slide in as the battle starts; a knocked-out enemy slides off
 *   the stage before his defeat line; when the player loses, the screen
 *   closes to dark in a circle before the end screen.
 * - A backfire (a perfect defense hurting the attacker) is a hit like any
 *   other; its effect text says whose support dropped.
 * - A special character steps in with a cut-in: the cut-in opens over the
 *   middle of the stage (the stage puts the enemy's box and both labels
 *   aside), the narration says who it is, his line goes in the top box under
 *   his name, and the cut-in closes (the enemy's box and labels come back as
 *   they were). Then the effect text, "Kriittinen osuma!" and the hit.
 */
export type Step =
  | {
      kind: 'type'
      box: 'top' | 'bottom'
      text: string
      /** The line as screen readers hear it, with the speaker for spoken lines. */
      announce: string
    }
  /** Empties a box; the enemy's is also hidden until he speaks again. */
  | { kind: 'clear'; box: 'top' | 'bottom' }
  | { kind: 'wait'; until: 'advance' | 'pause' }
  | {
      /** Phase labels on the boxes' top edges: a string sets one, null clears it, absent keeps it. */
      kind: 'tags'
      top?: string | null
      bottom?: string | null
      announce?: string
    }
  | {
      kind: 'hit'
      target: Side
      damage: number
      from: number
      to: number
      /** E.g. "Sinä: kannatus 85". */
      announce: string
      /** The attack backfired on the attacker. */
      backfire: boolean
      /** A critical hit (a special character stepped in). */
      critical: boolean
    }
  /**
   * A special character's cut-in opens over the middle of the stage. The
   * stage puts the enemy's box and both labels aside until the cut-in closes.
   */
  | { kind: 'cutIn'; special: string }
  /** The cut-in closes; the enemy's box and the labels show what they did before. */
  | { kind: 'cutOut' }
  /** Both sides slide onto the stage. */
  | { kind: 'enter' }
  /** `who` slides off the stage. */
  | { kind: 'exit'; who: Side }
  | { kind: 'prompt'; prompt: PromptEvent }
  /** The screen goes dark in a closing circle (the player lost). */
  | { kind: 'irisOut' }
  | { kind: 'end'; result: BattleResult; text: string }

export type PromptEvent = Extract<BattleEvent, { type: 'prompt' }>

const PHASE_TAG = {
  enemyAttack: { box: 'top', key: 'tag.enemyAttack' },
  enemyDefense: { box: 'top', key: 'tag.enemyDefense' },
  reply: { box: 'bottom', key: 'tag.reply' },
  playerAttack: { box: 'bottom', key: 'tag.playerAttack' },
} as const

export function planSteps(
  events: BattleEvent[],
  locale: Locale,
  ui: UiStrings,
  enemy: Enemy,
  { announceEnemyAttack = true, announceTurns = true }: Partial<PresentationOptions> = {},
): Step[] {
  const steps: Step[] = []
  const you = format({ key: 'a11y.you' }, locale, ui)
  const foe = localize(enemy.subject, locale)
  /** What the end screen says: the ending's narration, or its own "…Result" text. */
  let endText = ''
  /** Without the attack's narration, screen readers hear his label before his line. */
  let attackLabel = ''

  events.forEach((event, i) => {
    const next = events[i + 1]
    switch (event.type) {
      case 'narrate': {
        // config.json presentation.announceEnemyAttack: false skips "… käytti …!".
        const key = 'key' in event.message ? event.message.key : ''
        if (key === 'enemy.used' && !announceEnemyAttack) break
        const text = format(event.message, locale, ui)
        if (next?.type === 'prompt') {
          // The prompt is the grid's label rather than a line of its own.
          steps.push({ kind: 'tags', bottom: text, announce: text })
          break
        }
        // The ending's narration clears both labels.
        if (next?.type === 'end') steps.push({ kind: 'tags', top: null, bottom: null })
        steps.push({ kind: 'type', box: 'bottom', text, announce: text })
        // An ending can have a separate text for the end screen, e.g. end.koLose
        // ("Silmissäsi pimenee...") is followed by end.koLoseResult.
        const resultKey = `${key}Result`
        endText =
          'key' in event.message && resultKey in ui
            ? format({ ...event.message, key: resultKey }, locale, ui)
            : text
        // A hit right after an effect text plays before the wait (the spec's order).
        if (next?.type !== 'hit') steps.push({ kind: 'wait', until: 'advance' })
        break
      }
      case 'phase': {
        if (event.phase === 'newRound') {
          steps.push({ kind: 'clear', box: 'top' }, { kind: 'tags', top: null, bottom: null })
          // No narration will replace the last exchange's text, so it goes now.
          if (!announceEnemyAttack) steps.push({ kind: 'clear', box: 'bottom' })
          break
        }
        const { box, key } = PHASE_TAG[event.phase]
        const vars = 'name' in event ? { name: event.name } : undefined
        const tag = format({ key, vars }, locale, ui)
        if (event.phase === 'enemyAttack' && !announceEnemyAttack) attackLabel = tag
        // The player's attack: the enemy's last line and its label go.
        if (event.phase === 'playerAttack') {
          steps.push({ kind: 'clear', box: 'top' }, { kind: 'tags', top: null, bottom: tag })
        } else {
          steps.push({ kind: 'tags', [box]: tag })
        }
        break
      }
      case 'say': {
        const text = localize(event.text, locale)
        const speaker = event.who === 'enemy' ? foe : you
        const label = event.who === 'enemy' && attackLabel ? `${attackLabel}. ` : ''
        attackLabel = ''
        steps.push({
          kind: 'type',
          box: event.who === 'enemy' ? 'top' : 'bottom',
          text,
          announce: `${label}${speaker}: ${text}`,
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
          backfire: event.counter,
          critical: event.critical,
        })
        if (events[i - 1]?.type === 'narrate') steps.push({ kind: 'wait', until: 'advance' })
        break
      }
      case 'enter':
        steps.push({ kind: 'enter' })
        break
      case 'turn': {
        // config.json presentation.announceTurns: false skips these lines.
        if (!announceTurns) break
        const text =
          event.who === 'enemy'
            ? localize(event.first ? enemy.opensDebate : enemy.changesTopic, locale)
            : format({ key: 'turn.player' }, locale, ui)
        if (event.who === 'player') {
          steps.push({ kind: 'clear', box: 'top' }, { kind: 'tags', top: null, bottom: null })
        }
        steps.push(
          { kind: 'type', box: 'bottom', text, announce: text },
          { kind: 'wait', until: 'advance' },
        )
        break
      }
      case 'specialEnter':
        steps.push({ kind: 'cutIn', special: event.special.id })
        break
      case 'specialSay': {
        const name = localize(event.special.name, locale)
        const text = localize(event.text, locale)
        steps.push(
          { kind: 'tags', top: name },
          { kind: 'type', box: 'top', text, announce: `${name}: ${text}` },
          { kind: 'wait', until: 'advance' },
        )
        break
      }
      case 'specialExit':
        steps.push({ kind: 'cutOut' })
        break
      case 'exit':
        // He has left: his box and the labels go before he slides out.
        if (event.who === 'enemy') steps.push({ kind: 'clear', box: 'top' })
        steps.push({ kind: 'tags', top: null, bottom: null }, { kind: 'exit', who: event.who })
        break
      case 'prompt':
        steps.push({ kind: 'prompt', prompt: event })
        break
      case 'end':
        // Losing: the screen closes to dark before the end screen.
        if (event.result.kind === 'koLose' || event.result.kind === 'pointsLose') {
          steps.push({ kind: 'irisOut' })
        }
        steps.push({ kind: 'end', result: event.result, text: endText })
        break
    }
  })
  return steps
}
