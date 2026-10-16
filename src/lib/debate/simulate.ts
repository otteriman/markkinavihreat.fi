import { chooseAttack, chooseReply, currentAttack, startBattle, type BattleState } from './battle'
import { damageFor } from './difficulty'
import { seededRng, type Rng } from './rng'
import type {
  DebateConfig,
  Difficulty,
  Enemy,
  Guardrail,
  PlayerAttack,
  Quality,
  StrategyName,
  Tier,
} from './types'

/**
 * Simulated play for tuning difficulty: `npm run debate:balance`, the
 * balance tests and the lab page all use this, so they always agree.
 */

/** Average damage the enemy takes from `attack`, given the defense odds. */
export function expectedDamage(attack: PlayerAttack, difficulty: Difficulty): number {
  const weights = attack.defenses.map((d) => difficulty.enemyDefenseWeights[d.quality])
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return 0
  return attack.defenses.reduce(
    (sum, d, i) => sum + (weights[i] / total) * damageFor(difficulty, 'enemy', d.quality),
    0,
  )
}

/** Vahva / Hyvä / Heikko, from expected damage as a share of a full hit on the enemy. */
export function tierOf(attack: PlayerAttack, difficulty: Difficulty, config: DebateConfig): Tier {
  const full = difficulty.enemy.baseDamage
  const share = full > 0 ? expectedDamage(attack, difficulty) / full : 0
  return share >= config.tiers.vahva ? 'vahva' : share >= config.tiers.hyva ? 'hyva' : 'heikko'
}

/** How a simulated player chooses. */
export interface Strategy {
  reply: (state: BattleState, rng: Rng) => number
  attack: (state: BattleState, rng: Rng) => string
}

/** First reply of the first available quality in `preference`, in display order. */
const replyBy = (preference: (state: BattleState) => Quality[]) => (state: BattleState) => {
  const { replies } = currentAttack(state)
  for (const quality of preference(state)) {
    const index = state.replyOrder.find((i) => replies[i].quality === quality)
    if (index !== undefined) return index
  }
  return state.replyOrder[0]
}

const randomReply = (state: BattleState, rng: Rng) =>
  state.replyOrder[Math.floor(rng() * state.replyOrder.length)]

const available = (state: BattleState) =>
  state.playerAttacks.filter((a) => !state.used.includes(a.id))

/** The unused attack with the highest (or lowest) expected damage. */
const attackBy = (best: boolean) => (state: BattleState) => {
  const ranked = available(state)
    .map((a) => ({ id: a.id, value: expectedDamage(a, state.difficulty) }))
    .sort((a, b) => (best ? b.value - a.value : a.value - b.value))
  return ranked[0].id
}

const randomAttack = (state: BattleState, rng: Rng) => {
  const options = available(state)
  return options[Math.floor(rng() * options.length)].id
}

const STRONG: Quality[] = ['strong', 'medium', 'weak']
const MEDIUM: Quality[] = ['medium', 'strong', 'weak']
const WEAK: Quality[] = ['weak', 'medium', 'strong']
const odd = (state: BattleState) => state.round % 2 === 1

/** The play styles from the spec's balance check, plus "green instinct". */
export const STRATEGIES: Record<StrategyName, { label: string; strategy: Strategy }> = {
  perfect: {
    label: 'Perfect: strong replies, best attacks',
    strategy: { reply: replyBy(() => STRONG), attack: attackBy(true) },
  },
  mostlyStrong: {
    label: 'Half strong, half medium replies, best attacks',
    strategy: { reply: replyBy((s) => (odd(s) ? STRONG : MEDIUM)), attack: attackBy(true) },
  },
  allMedium: {
    label: 'All medium replies, best attacks',
    strategy: { reply: replyBy(() => MEDIUM), attack: attackBy(true) },
  },
  strongOrWeak: {
    label: 'Half strong, half weak replies, best attacks',
    strategy: { reply: replyBy((s) => (odd(s) ? STRONG : WEAK)), attack: attackBy(true) },
  },
  random: {
    label: 'Random replies and attacks',
    strategy: { reply: randomReply, attack: randomAttack },
  },
  greenInstinct: {
    label: 'Green instinct: weak replies, weakest attacks',
    strategy: { reply: replyBy(() => WEAK), attack: attackBy(false) },
  },
}

export interface SimulationStats {
  runs: number
  winRate: number
  tieRate: number
  loseRate: number
  /** Share of all runs that ended in a KO, either way. */
  koRate: number
  avgPlayer: number
  avgEnemy: number
  /** Average battle length in rounds. */
  avgRounds: number
}

export function simulate(
  enemy: Enemy,
  difficulty: Difficulty,
  attackSlots: number,
  strategy: Strategy,
  { runs = 10_000, seed = 1 }: { runs?: number; seed?: number } = {},
): SimulationStats {
  const rng = seededRng(seed)
  let win = 0
  let tie = 0
  let ko = 0
  let player = 0
  let foe = 0
  let rounds = 0
  for (let run = 0; run < runs; run++) {
    let { state } = startBattle({ enemy, difficulty, attackSlots, rng })
    while (state.phase !== 'over') {
      state =
        state.phase === 'reply'
          ? chooseReply(state, strategy.reply(state, rng)).state
          : chooseAttack(state, strategy.attack(state, rng), rng).state
    }
    const result = state.result!
    if (result.kind === 'koWin' || result.kind === 'pointsWin') win++
    if (result.kind === 'tie') tie++
    if (result.kind === 'koWin' || result.kind === 'koLose') ko++
    player += result.player
    foe += result.enemy
    rounds += state.round
  }
  return {
    runs,
    winRate: win / runs,
    tieRate: tie / runs,
    loseRate: (runs - win - tie) / runs,
    koRate: ko / runs,
    avgPlayer: player / runs,
    avgEnemy: foe / runs,
    avgRounds: rounds / runs,
  }
}

/** Guardrail breaches as readable messages; empty when within bounds. */
export function checkGuardrail(
  name: StrategyName,
  stats: SimulationStats,
  rail: Guardrail,
): string[] {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const out: string[] = []
  const bound = (what: string, value: number, min?: number, max?: number) => {
    if (min !== undefined && value < min)
      out.push(`${name}: ${what} ${pct(value)} is below ${pct(min)}`)
    if (max !== undefined && value > max)
      out.push(`${name}: ${what} ${pct(value)} is above ${pct(max)}`)
  }
  bound('win rate', stats.winRate, rail.minWinRate, rail.maxWinRate)
  bound('lose rate', stats.loseRate, rail.minLoseRate, rail.maxLoseRate)
  const len = (v: number) => v.toFixed(1)
  if (rail.minAvgRounds !== undefined && stats.avgRounds < rail.minAvgRounds) {
    out.push(`${name}: average length ${len(stats.avgRounds)} rounds is below ${rail.minAvgRounds}`)
  }
  if (rail.maxAvgRounds !== undefined && stats.avgRounds > rail.maxAvgRounds) {
    out.push(`${name}: average length ${len(stats.avgRounds)} rounds is above ${rail.maxAvgRounds}`)
  }
  return out
}
