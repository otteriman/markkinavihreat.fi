import { describe, expect, it } from 'vitest'
import { damageFor, DifficultyError, resolveDifficulty } from '../../src/lib/debate/difficulty'
import { pickWeighted, seededRng } from '../../src/lib/debate/rng'
import { specDifficulty, testConfig } from './debate-fixtures'

const config = testConfig({
  difficulties: {
    normal: specDifficulty(),
    hard: { extends: 'normal', player: { damage: { medium: 0.6 } } },
    harder: { extends: 'hard', enemyDefenseWeights: { strong: 2 } },
    loopA: { extends: 'loopB' },
    loopB: { extends: 'loopA' },
    broken: { extends: 'normal', maxRounds: 0, player: { damage: { weak: -1 } } },
  },
})

describe('resolveDifficulty', () => {
  it('uses the shipped preset by default', () => {
    expect(resolveDifficulty(config)).toEqual(specDifficulty())
  })

  it('applies extends as a deep merge, through several levels', () => {
    const d = resolveDifficulty(config, 'harder')
    expect(d.player.damage).toEqual({ strong: 0, medium: 0.6, weak: 1 })
    expect(d.enemyDefenseWeights).toEqual({ strong: 2, medium: 1, weak: 1 })
    expect(d.enemy).toEqual(specDifficulty().enemy)
  })

  it('applies one-off overrides by path', () => {
    const d = resolveDifficulty(config, 'normal', { 'player.damage.medium': 0.4, maxRounds: 3 })
    expect(d.player.damage.medium).toBe(0.4)
    expect(d.maxRounds).toBe(3)
  })

  it('rejects unknown overrides and groups', () => {
    expect(() => resolveDifficulty(config, 'normal', { 'player.armor': 1 })).toThrow(
      'Unknown difficulty setting "player.armor"',
    )
    expect(() => resolveDifficulty(config, 'normal', { player: 1 })).toThrow('is a group')
  })

  it('names the problem for unknown presets, loops and bad values', () => {
    expect(() => resolveDifficulty(config, 'nope')).toThrow(DifficultyError)
    expect(() => resolveDifficulty(config, 'nope')).toThrow('Unknown difficulty "nope"')
    expect(() => resolveDifficulty(config, 'loopA')).toThrow('loops: loopA → loopB → loopA')
    expect(() => resolveDifficulty(config, 'broken')).toThrow(
      /maxRounds must be a whole number at least 1 \(is 0\).*player\.damage\.weak must be between 0 and 2/,
    )
  })

  it('rejects all-zero defense weights', () => {
    expect(() =>
      resolveDifficulty(config, 'normal', {
        'enemyDefenseWeights.strong': 0,
        'enemyDefenseWeights.medium': 0,
        'enemyDefenseWeights.weak': 0,
      }),
    ).toThrow('can’t all be 0')
  })
})

describe('damageFor', () => {
  it('follows the spec table: 0 / 15 / 30', () => {
    const d = specDifficulty()
    expect(damageFor(d, 'player', 'strong')).toBe(0)
    expect(damageFor(d, 'player', 'medium')).toBe(15)
    expect(damageFor(d, 'enemy', 'weak')).toBe(30)
  })

  it('rounds to whole points', () => {
    const d = resolveDifficulty(config, 'normal', { 'player.damage.medium': 0.33 })
    expect(damageFor(d, 'player', 'medium')).toBe(10)
  })
})

describe('pickWeighted', () => {
  it('picks in proportion to the weights', () => {
    const rng = seededRng(7)
    const counts = [0, 0, 0]
    for (let i = 0; i < 30_000; i++) counts[pickWeighted([2, 1, 0], rng)]++
    expect(counts[2]).toBe(0)
    expect(counts[0] / counts[1]).toBeGreaterThan(1.9)
    expect(counts[0] / counts[1]).toBeLessThan(2.1)
  })
})
