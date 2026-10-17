import { describe, expect, it } from 'vitest'
import { config, enemies, specials } from '../../src/lib/debate/data'
import { resolveDifficulty } from '../../src/lib/debate/difficulty'
import {
  checkGuardrail,
  expectedDamage,
  simulate,
  STRATEGIES,
  tierOf,
} from '../../src/lib/debate/simulate'
import type { StrategyName } from '../../src/lib/debate/types'
import { specDifficulty, specEnemy, testConfig } from './debate-fixtures'

describe('the frozen "spec" preset', () => {
  it('still holds the spec’s numbers', () => {
    expect(resolveDifficulty(config, 'spec')).toEqual(specDifficulty())
  })
})

describe('engine maths against the spec’s balance check', () => {
  // The spec's battle (fixture qualities) with the spec's numbers. This guards
  // the engine, not the content: content and presets can change freely.
  const enemy = specEnemy()
  const difficulty = specDifficulty()
  const run = (name: StrategyName) =>
    simulate(enemy, difficulty, 6, STRATEGIES[name].strategy, { runs: 5000, seed: 11 })

  it('derives the spec’s attack tiers and expected damage (19 / 11 / 4)', () => {
    const cfg = testConfig()
    expect(
      enemy.playerAttacks.map((a) => [
        a.id,
        expectedDamage(a, difficulty),
        tierOf(a, difficulty, cfg),
      ]),
    ).toEqual([
      ['vahva1', 18.75, 'vahva'],
      ['vahva2', 18.75, 'vahva'],
      ['hyva1', 11.25, 'hyva'],
      ['hyva2', 11.25, 'hyva'],
      ['heikko1', 3.75, 'heikko'],
      ['heikko2', 3.75, 'heikko'],
    ])
  })

  it('perfect play: player 100, enemy about 40, ties only when every defense is strong', () => {
    const s = run('perfect')
    expect(s.avgPlayer).toBe(100)
    expect(s.avgEnemy).toBeCloseTo(40, -0.5)
    expect(s.loseRate).toBe(0)
    expect(s.tieRate).toBeCloseTo(1 / 64, 1)
  })

  it('half strong, half medium: player 70, enemy 40', () => {
    const s = run('mostlyStrong')
    expect(s.avgPlayer).toBe(70)
    expect(s.avgEnemy).toBeCloseTo(40, -0.5)
  })

  it('all medium, and half strong half weak: 40 vs 40, a coin flip', () => {
    for (const name of ['allMedium', 'strongOrWeak'] as const) {
      const s = run(name)
      expect(s.avgPlayer).toBe(40)
      expect(s.avgEnemy).toBeCloseTo(40, -0.5)
      expect(Math.abs(s.winRate - s.loseRate)).toBeLessThan(0.05)
    }
  })

  it('random play: player about 25, enemy about 55, a clear loss', () => {
    const s = run('random')
    expect(s.avgPlayer).toBeGreaterThan(22)
    expect(s.avgPlayer).toBeLessThan(30)
    expect(s.avgEnemy).toBeGreaterThan(52)
    expect(s.avgEnemy).toBeLessThan(60)
    expect(s.loseRate).toBeGreaterThan(0.6)
  })
})

describe('guardrails on the real content', () => {
  for (const [preset, rails] of Object.entries(config.guardrails)) {
    it(`"${preset}" stays within its guardrails`, () => {
      const difficulty = resolveDifficulty(config, preset)
      const breaches = enemies.flatMap((enemy) =>
        Object.entries(rails).flatMap(([name, rail]) => {
          const strategy = STRATEGIES[name as StrategyName].strategy
          const stats = simulate(enemy, difficulty, config.rules.playerAttackSlots, strategy, {
            runs: 4000,
            specials,
          })
          return checkGuardrail(name as StrategyName, stats, rail!).map((m) => `${enemy.id}: ${m}`)
        }),
      )
      expect(breaches).toEqual([])
    })
  }

  it('reports a breach in readable form', () => {
    const stats = {
      runs: 1,
      winRate: 0.3,
      tieRate: 0,
      loseRate: 0.7,
      koRate: 0,
      avgPlayer: 0,
      avgEnemy: 0,
      avgRounds: 6.2,
    }
    expect(checkGuardrail('random', stats, { maxWinRate: 0.2, maxAvgRounds: 5 })).toEqual([
      'random: win rate 30.0% is above 20.0%',
      'random: average length 6.2 rounds is above 5',
    ])
  })
})
