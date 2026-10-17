import type {
  DebateConfig,
  Difficulty,
  Enemy,
  EnemyAttack,
  Localized,
  PlayerAttack,
  Quality,
} from '../../src/lib/debate/types'

/** Test fixtures for the debate game: small, made-up content with known qualities. */

export const txt = (s: string): Localized => ({ fi: `${s} fi`, sv: `${s} sv`, en: `${s} en` })

export function enemyAttack(
  id: string,
  qualities: Quality[] = ['strong', 'medium', 'weak', 'weak'],
) {
  return {
    id,
    source: `enemies/test/enemy-attacks/${id}.json`,
    name: txt(`${id} name`),
    announce: txt(`${id} announce`),
    line: txt(`${id} line`),
    replies: qualities.map((quality, i) => ({
      label: txt(`${id} r${i}`),
      quality,
      say: txt(`${id} say ${i}`),
      reaction: txt(`${id} reaction ${i}`),
    })),
  } satisfies EnemyAttack
}

export function playerAttack(id: string, qualities: Quality[], order?: number) {
  return {
    id,
    source: `enemies/test/player-attacks/${id}.json`,
    ...(order === undefined ? {} : { order }),
    label: txt(`${id} label`),
    say: txt(`${id} say`),
    defenses: qualities.map((quality, i) => ({ quality, say: txt(`${id} defense ${i}`) })),
  } satisfies PlayerAttack
}

const S = 'strong'
const M = 'medium'
const W = 'weak'

/**
 * The spec's battle in qualities only: 4 enemy attacks (1 strong, 1 medium,
 * 2 weak replies each) and 6 player attacks in the spec's tiers (2 vahva,
 * 2 hyvä, 2 heikko). Frozen, so the engine's maths can be checked against the
 * spec's balance table however the real content changes.
 */
export function specEnemy(): Enemy {
  return {
    id: 'test',
    source: 'enemies/test/enemy.json',
    status: txt('status'),
    subject: txt('subject'),
    appear: txt('appear'),
    opening: txt('opening'),
    defeat: txt('defeat'),
    sprite: 'kansalliskonservatiivi',
    attacks: ['a1', 'a2', 'a3', 'a4'].map((id) => enemyAttack(id)),
    playerAttacks: [
      playerAttack('vahva1', [M, W, S, W], 1),
      playerAttack('vahva2', [M, W, W, S], 2),
      playerAttack('hyva1', [S, M, W, S], 3),
      playerAttack('hyva2', [S, M, S, W], 4),
      playerAttack('heikko1', [S, S, S, M], 5),
      playerAttack('heikko2', [S, S, S, M], 6),
    ],
  }
}

export const specDifficulty = (): Difficulty => ({
  maxRounds: 4,
  player: {
    kannatus: 100,
    baseDamage: 30,
    damage: { strong: 0, medium: 0.5, weak: 1 },
    counter: 0,
  },
  enemy: {
    kannatus: 100,
    baseDamage: 30,
    damage: { strong: 0, medium: 0.5, weak: 1 },
    counter: 0,
  },
  enemyDefenseWeights: { strong: 1, medium: 1, weak: 1 },
  tieMargin: 0,
})

export function testConfig(overrides: Partial<DebateConfig> = {}): DebateConfig {
  return {
    difficulty: 'normal',
    difficulties: { normal: specDifficulty() },
    guardrails: {},
    rules: {
      repliesPerAttack: 4,
      replyMix: { strong: 1, medium: 1, weak: 2 },
      defensesPerAttack: 4,
      minStrongDefenses: 1,
      playerAttackSlots: 6,
      maxLabelLength: 17,
      maxLineLength: 120,
    },
    tiers: { vahva: 0.5, hyva: 0.25 },
    typing: { msPerChar: 30 },
    presentation: { announceEnemyAttack: true },
    ...overrides,
  }
}
