import { counterFor, damageFor } from './difficulty'
import { pickWeighted, shuffle, type Rng } from './rng'
import type { Message } from './text'
import type { Difficulty, Enemy, EnemyAttack, Localized, PlayerAttack, Quality } from './types'

/**
 * The battle engine: a pure state machine with no DOM and no timing.
 *
 *   startBattle → reply prompt → chooseReply → attack prompt → chooseAttack → …
 *
 * The battle runs until one side's KANNATUS reaches 0; difficulty.maxRounds is
 * only a safety net that decides on points. A perfect defense makes the
 * attack backfire on the attacker (difficulty counter damage), which keeps
 * battles short: about four rounds with the shipped numbers.
 *
 * Each call returns the next state and the events to play back in order. The
 * UI only renders events (narration and the player's lines go in the bottom
 * box, the enemy's lines in the top box) and sends the player's choices back.
 * All randomness comes from the injected `rng`, so a seed replays a battle.
 */

export type Side = 'player' | 'enemy'

export type BattleEvent =
  /** Narration in the bottom box. */
  | { type: 'narrate'; message: Message }
  /** A line spoken by one side: the player's in the bottom box, the enemy's in the top box. */
  | { type: 'say'; who: Side; text: Localized }
  /**
   * Whose move it is now, for the stage's phase labels: the enemy attacks
   * (`name`: the attack), the player replies (`name`: the reply's label), the
   * player attacks (`name`: the attack's label), or the enemy defends.
   */
  | { type: 'phase'; phase: 'enemyAttack' | 'reply' | 'playerAttack'; name: Localized }
  | { type: 'phase'; phase: 'enemyDefense' | 'newRound' }
  /** Both sides take the stage (they slide in when the battle starts). */
  | { type: 'enter' }
  /** `who` leaves the stage (the enemy slides out when knocked out). */
  | { type: 'exit'; who: Side }
  /**
   * `target` lost `damage` KANNATUS (may be 0); drain its bar from `from` to
   * `to`. `quality` is the defense's. With `counter`, a perfect defense made
   * the attack backfire, so the target is the attacker.
   */
  | {
      type: 'hit'
      target: Side
      quality: Quality
      damage: number
      from: number
      to: number
      counter: boolean
    }
  | { type: 'prompt'; kind: 'reply'; options: ReplyOption[] }
  | { type: 'prompt'; kind: 'attack'; options: AttackOption[] }
  | { type: 'end'; result: BattleResult }

export interface ReplyOption {
  /** Index into the attack's `replies`; send it back to chooseReply. */
  index: number
  label: Localized
}

export interface AttackOption {
  id: string
  label: Localized
  used: boolean
}

export type ResultKind = 'koWin' | 'koLose' | 'pointsWin' | 'pointsLose' | 'tie'

export interface BattleResult {
  kind: ResultKind
  player: number
  enemy: number
  /** Replies of quality "strong", out of `repliesGiven`. */
  strongReplies: number
  repliesGiven: number
}

export interface BattleState {
  enemy: Enemy
  difficulty: Difficulty
  phase: 'reply' | 'attack' | 'over'
  /** 1-based. */
  round: number
  /**
   * The enemy's attacks, one per round, in order. A shuffled deck of all his
   * attacks; when a long battle runs through it, another shuffled deck is
   * added, so no attack repeats until all have been used.
   */
  enemyAttacks: EnemyAttack[]
  /** The player's attack grid, in grid order. */
  playerAttacks: PlayerAttack[]
  /** Player attacks used since the grid was last full; all free up again once every one is used. */
  used: string[]
  /** The current attack's replies in display order (indices into `replies`). */
  replyOrder: number[]
  player: number
  enemyKannatus: number
  strongReplies: number
  repliesGiven: number
  result: BattleResult | null
}

export class BattleError extends Error {}

type Step = { state: BattleState; events: BattleEvent[] }

export interface BattleSetup {
  enemy: Enemy
  difficulty: Difficulty
  /** Size of the player's attack grid (config.json rules.playerAttackSlots). */
  attackSlots: number
  rng: Rng
}

export function startBattle({ enemy, difficulty, attackSlots, rng }: BattleSetup): Step {
  // More player attacks than grid slots: a random subset, kept in grid order.
  const picked = new Set(shuffle(enemy.playerAttacks, rng).slice(0, attackSlots))
  const playerAttacks = enemy.playerAttacks.filter((a) => picked.has(a))
  const state: BattleState = {
    enemy,
    difficulty,
    phase: 'reply',
    round: 0,
    enemyAttacks: shuffle(enemy.attacks, rng),
    playerAttacks,
    used: [],
    replyOrder: [],
    player: difficulty.player.kannatus,
    enemyKannatus: difficulty.enemy.kannatus,
    strongReplies: 0,
    repliesGiven: 0,
    result: null,
  }
  const events: BattleEvent[] = [
    { type: 'enter' },
    { type: 'narrate', message: { text: enemy.appear } },
    { type: 'say', who: 'enemy', text: enemy.opening },
  ]
  return nextRound(state, events, rng)
}

function nextRound(prev: BattleState, events: BattleEvent[], rng: Rng): Step {
  const round = prev.round + 1
  let enemyAttacks = prev.enemyAttacks
  if (round > enemyAttacks.length) {
    // A new deck, never starting with the attack he just used.
    const deck = shuffle(prev.enemy.attacks, rng)
    if (deck.length > 1 && deck[0] === enemyAttacks.at(-1)) [deck[0], deck[1]] = [deck[1], deck[0]]
    enemyAttacks = [...enemyAttacks, ...deck]
  }
  const attack = enemyAttacks[round - 1]
  const state: BattleState = {
    ...prev,
    phase: 'reply',
    round,
    enemyAttacks,
    used: prev.used.length >= prev.playerAttacks.length ? [] : prev.used,
    replyOrder: shuffle(
      attack.replies.map((_, i) => i),
      rng,
    ),
  }
  events.push(
    { type: 'phase', phase: 'newRound' },
    {
      type: 'narrate',
      message: { key: 'enemy.used', vars: { enemy: prev.enemy.subject, attack: attack.announce } },
    },
    { type: 'phase', phase: 'enemyAttack', name: attack.name },
    { type: 'say', who: 'enemy', text: attack.line },
    { type: 'narrate', message: { key: 'prompt.reply' } },
    { type: 'prompt', kind: 'reply', options: replyOptions(state) },
  )
  return { state, events }
}

export function currentAttack(state: BattleState): EnemyAttack {
  return state.enemyAttacks[state.round - 1]
}

export function replyOptions(state: BattleState): ReplyOption[] {
  const { replies } = currentAttack(state)
  return state.replyOrder.map((index) => ({ index, label: replies[index].label }))
}

export function attackOptions(state: BattleState): AttackOption[] {
  return state.playerAttacks.map((a) => ({
    id: a.id,
    label: a.label,
    used: state.used.includes(a.id),
  }))
}

/**
 * One exchange: `defender` answered an attack with a reply or defense of
 * `quality`. A perfect (strong) defense makes the attack backfire on the
 * attacker when the difficulty has counter damage; otherwise the defender
 * takes the damage for its quality. Returns the new state and the hit.
 */
function exchange(state: BattleState, defender: Side, quality: Quality) {
  const attacker: Side = defender === 'player' ? 'enemy' : 'player'
  const backfire = quality === 'strong' ? counterFor(state.difficulty, attacker) : 0
  const target = backfire > 0 ? attacker : defender
  const damage = backfire > 0 ? backfire : damageFor(state.difficulty, defender, quality)
  const from = target === 'player' ? state.player : state.enemyKannatus
  const to = Math.max(0, from - damage)
  const next: BattleState =
    target === 'player' ? { ...state, player: to } : { ...state, enemyKannatus: to }
  const event: BattleEvent = {
    type: 'hit',
    target,
    quality,
    damage,
    from,
    to,
    counter: backfire > 0,
  }
  return { state: next, event }
}

/**
 * The effect text's UI key: by the defense's quality, from the player's side
 * ("attack" when the player attacked), or the backfire text when it backfired.
 */
function effectKey(side: 'attack' | 'defend', quality: Quality, hit: BattleEvent): string {
  const backfire = hit.type === 'hit' && hit.counter
  return `effect.${side}.${backfire ? 'backfire' : quality}`
}

/** A KO ending if either side is out of KANNATUS. */
function knockout(state: BattleState): ResultKind | null {
  if (state.player <= 0) return 'koLose'
  if (state.enemyKannatus <= 0) return 'koWin'
  return null
}

function end(state: BattleState, kind: ResultKind, events: BattleEvent[]): Step {
  const result: BattleResult = {
    kind,
    player: state.player,
    enemy: state.enemyKannatus,
    strongReplies: state.strongReplies,
    repliesGiven: state.repliesGiven,
  }
  if (kind === 'koWin') {
    // The enemy flees the stage, with his own defeat line.
    events.push(
      { type: 'exit', who: 'enemy' },
      { type: 'narrate', message: { text: state.enemy.defeat } },
    )
  } else {
    events.push({
      type: 'narrate',
      message: {
        key: `end.${kind}`,
        vars: {
          enemy: state.enemy.subject,
          playerScore: state.player,
          enemyScore: state.enemyKannatus,
        },
      },
    })
  }
  events.push({ type: 'end', result })
  return { state: { ...state, phase: 'over', result }, events }
}

/** The player answers the current enemy attack with reply `index` (from the prompt's options). */
export function chooseReply(prev: BattleState, index: number): Step {
  if (prev.phase !== 'reply')
    throw new BattleError(`Not waiting for a reply (phase: ${prev.phase})`)
  const reply = currentAttack(prev).replies[index]
  if (!reply) throw new BattleError(`No reply ${index} for this attack`)

  const hit = exchange(prev, 'player', reply.quality)
  const state: BattleState = {
    ...hit.state,
    repliesGiven: prev.repliesGiven + 1,
    strongReplies: prev.strongReplies + (reply.quality === 'strong' ? 1 : 0),
  }
  const events: BattleEvent[] = [
    { type: 'phase', phase: 'reply', name: reply.label },
    { type: 'say', who: 'player', text: reply.say },
    { type: 'say', who: 'enemy', text: reply.reaction },
    { type: 'narrate', message: { key: effectKey('defend', reply.quality, hit.event) } },
    hit.event,
  ]
  const ko = knockout(state)
  if (ko) return end(state, ko, events)

  const next: BattleState = { ...state, phase: 'attack' }
  events.push(
    { type: 'narrate', message: { key: 'prompt.attack' } },
    { type: 'prompt', kind: 'attack', options: attackOptions(next) },
  )
  return { state: next, events }
}

/** The player attacks with player attack `id`; the enemy picks a defense at random. */
export function chooseAttack(prev: BattleState, id: string, rng: Rng): Step {
  if (prev.phase !== 'attack') {
    throw new BattleError(`Not waiting for an attack (phase: ${prev.phase})`)
  }
  const attack = prev.playerAttacks.find((a) => a.id === id)
  if (!attack) throw new BattleError(`No player attack "${id}" in this battle`)
  if (prev.used.includes(id)) throw new BattleError(`Player attack "${id}" was already used`)

  const weights = prev.difficulty.enemyDefenseWeights
  const defense =
    attack.defenses[
      pickWeighted(
        attack.defenses.map((d) => weights[d.quality]),
        rng,
      )
    ]
  const hit = exchange(prev, 'enemy', defense.quality)
  const state: BattleState = { ...hit.state, used: [...prev.used, id] }
  const events: BattleEvent[] = [
    { type: 'phase', phase: 'playerAttack', name: attack.label },
    { type: 'say', who: 'player', text: attack.say },
    { type: 'phase', phase: 'enemyDefense' },
    { type: 'say', who: 'enemy', text: defense.say },
    { type: 'narrate', message: { key: effectKey('attack', defense.quality, hit.event) } },
    hit.event,
  ]
  const ko = knockout(state)
  if (ko) return end(state, ko, events)
  if (state.round < state.difficulty.maxRounds) return nextRound(state, events, rng)

  // The safety net (maxRounds) was reached: decide on points.
  const diff = state.player - state.enemyKannatus
  const margin = state.difficulty.tieMargin
  return end(state, diff > margin ? 'pointsWin' : diff < -margin ? 'pointsLose' : 'tie', events)
}
