import { damageFor } from './difficulty'
import { pickWeighted, shuffle, type Rng } from './rng'
import type { Message } from './text'
import type { Difficulty, Enemy, EnemyAttack, Localized, PlayerAttack, Quality } from './types'

/**
 * The battle engine: a pure state machine with no DOM and no timing.
 *
 *   startBattle → reply prompt → chooseReply → attack prompt → chooseAttack → …
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
  | { type: 'phase'; phase: 'enemyDefense' }
  /** `target` lost `damage` KANNATUS (may be 0); drain its bar from `from` to `to`. */
  | { type: 'hit'; target: Side; quality: Quality; damage: number; from: number; to: number }
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
  /** The enemy attacks for this battle, one per round, in order. */
  enemyAttacks: EnemyAttack[]
  /** The player's attack grid, in grid order. */
  playerAttacks: PlayerAttack[]
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
    enemyAttacks: shuffle(enemy.attacks, rng).slice(0, difficulty.rounds),
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
    { type: 'narrate', message: { text: enemy.appear } },
    { type: 'say', who: 'enemy', text: enemy.opening },
  ]
  return nextRound(state, events, rng)
}

function nextRound(prev: BattleState, events: BattleEvent[], rng: Rng): Step {
  const round = prev.round + 1
  const attack = prev.enemyAttacks[round - 1]
  const state: BattleState = {
    ...prev,
    phase: 'reply',
    round,
    replyOrder: shuffle(
      attack.replies.map((_, i) => i),
      rng,
    ),
  }
  events.push(
    {
      type: 'narrate',
      message: { key: 'round.start', vars: { round, rounds: prev.difficulty.rounds } },
    },
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

/** Applies a hit; returns the new KANNATUS and the event. */
function hit(state: BattleState, target: Side, quality: Quality) {
  const from = target === 'player' ? state.player : state.enemyKannatus
  const damage = damageFor(state.difficulty, target, quality)
  const to = Math.max(0, from - damage)
  return { to, event: { type: 'hit', target, quality, damage, from, to } as BattleEvent }
}

function end(state: BattleState, kind: ResultKind, events: BattleEvent[]): Step {
  const result: BattleResult = {
    kind,
    player: state.player,
    enemy: state.enemyKannatus,
    strongReplies: state.strongReplies,
    repliesGiven: state.repliesGiven,
  }
  events.push(
    {
      type: 'narrate',
      message: {
        key: `end.${kind}`,
        vars: {
          enemy: state.enemy.subject,
          playerScore: state.player,
          enemyScore: state.enemyKannatus,
        },
      },
    },
    { type: 'end', result },
  )
  return { state: { ...state, phase: 'over', result }, events }
}

/** The player answers the current enemy attack with reply `index` (from the prompt's options). */
export function chooseReply(prev: BattleState, index: number): Step {
  if (prev.phase !== 'reply')
    throw new BattleError(`Not waiting for a reply (phase: ${prev.phase})`)
  const reply = currentAttack(prev).replies[index]
  if (!reply) throw new BattleError(`No reply ${index} for this attack`)

  const { to, event } = hit(prev, 'player', reply.quality)
  const state: BattleState = {
    ...prev,
    player: to,
    repliesGiven: prev.repliesGiven + 1,
    strongReplies: prev.strongReplies + (reply.quality === 'strong' ? 1 : 0),
  }
  const events: BattleEvent[] = [
    { type: 'phase', phase: 'reply', name: reply.label },
    { type: 'say', who: 'player', text: reply.say },
    { type: 'say', who: 'enemy', text: reply.reaction },
    { type: 'narrate', message: { key: `effect.defend.${reply.quality}` } },
    event,
  ]
  if (state.player <= 0) return end(state, 'koLose', events)

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
  const { to, event } = hit(prev, 'enemy', defense.quality)
  const state: BattleState = { ...prev, enemyKannatus: to, used: [...prev.used, id] }
  const events: BattleEvent[] = [
    { type: 'phase', phase: 'playerAttack', name: attack.label },
    { type: 'say', who: 'player', text: attack.say },
    { type: 'phase', phase: 'enemyDefense' },
    { type: 'say', who: 'enemy', text: defense.say },
    { type: 'narrate', message: { key: `effect.attack.${defense.quality}` } },
    event,
  ]
  if (state.enemyKannatus <= 0) return end(state, 'koWin', events)
  if (state.round < state.difficulty.rounds) return nextRound(state, events, rng)

  const diff = state.player - state.enemyKannatus
  const margin = state.difficulty.tieMargin
  return end(state, diff > margin ? 'pointsWin' : diff < -margin ? 'pointsLose' : 'tie', events)
}
