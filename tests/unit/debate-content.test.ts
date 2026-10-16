import { describe, expect, it } from 'vitest'
import { config, enemies, loadProblems, ui } from '../../src/lib/debate/data'
import { assembleEnemies } from '../../src/lib/debate/loader'
import { format, localize } from '../../src/lib/debate/text'
import { formatProblem, translationStatus, validateDebate } from '../../src/lib/debate/validate'
import type { Enemy } from '../../src/lib/debate/types'
import { enemyAttack, playerAttack, specEnemy, testConfig, txt } from './debate-fixtures'

describe('the real debate content', () => {
  it('passes every content rule', () => {
    expect(validateDebate(config, enemies, ui, loadProblems).map(formatProblem)).toEqual([])
  })

  it('has the kansalliskonservatiivi with its attacks', () => {
    const enemy = enemies.find((e) => e.id === 'kansalliskonservatiivi')
    expect(enemy?.attacks.length).toBeGreaterThanOrEqual(4)
    expect(enemy?.playerAttacks.length).toBeGreaterThanOrEqual(6)
  })
})

/** Problem messages for an enemy built from fixtures, after `change` breaks it. */
function problemsFor(change: (enemy: Enemy) => void, cfg = testConfig()) {
  const enemy = specEnemy()
  change(enemy)
  const ui = Object.fromEntries(['status.player', 'round.start'].map((k) => [k, txt(k)]))
  return validateDebate(cfg, [enemy], ui)
    .filter((p) => p.file !== 'ui.json')
    .map(formatProblem)
}

describe('validateDebate', () => {
  it('accepts the fixture enemy', () => {
    expect(problemsFor(() => {})).toEqual([])
  })

  it('explains a wrong reply mix', () => {
    expect(
      problemsFor(
        (e) => (e.attacks[1] = enemyAttack('a2', ['strong', 'strong', 'medium', 'weak'])),
      ),
    ).toEqual([
      'src/data/debate/enemies/test/enemy-attacks/a2.json: replies need exactly ' +
        '1 strong, 1 medium, 2 weak (found 2 strong, 1 medium, 1 weak)',
    ])
  })

  it('explains a wrong number of replies or defenses', () => {
    const problems = problemsFor((e) => {
      e.attacks[0].replies.pop()
      e.playerAttacks[0].defenses.push({ quality: 'weak', say: txt('x') })
    })
    expect(problems).toContain(
      'src/data/debate/enemies/test/enemy-attacks/a1.json: needs exactly 4 replies (has 3)',
    )
    expect(problems).toContain(
      'src/data/debate/enemies/test/player-attacks/vahva1.json: needs exactly 4 defenses (has 5)',
    )
  })

  it('requires a strong defense on every player attack', () => {
    expect(
      problemsFor(
        (e) => (e.playerAttacks[0] = playerAttack('vahva1', ['weak', 'weak', 'weak', 'medium'])),
      ),
    ).toEqual([
      'src/data/debate/enemies/test/player-attacks/vahva1.json: needs at least 1 strong defense ' +
        '(has 0): every attack must be beatable',
    ])
  })

  it('catches long labels, missing languages and bad qualities', () => {
    const problems = problemsFor((e) => {
      e.attacks[0].replies[0].label = { fi: 'Aivan liian pitkä nappi', sv: 'ok', en: 'ok' }
      e.playerAttacks[1].say = { fi: 'vain suomeksi' } as never
      ;(e.attacks[2].replies[3] as { quality: string }).quality = 'great'
    })
    expect(problems).toContain(
      'src/data/debate/enemies/test/enemy-attacks/a1.json: replies[0].label (fi) is 23 characters, ' +
        'the limit is 17: "Aivan liian pitkä nappi"',
    )
    expect(problems).toContain(
      'src/data/debate/enemies/test/player-attacks/vahva2.json: say is missing: sv, en',
    )
    expect(problems).toContain(
      'src/data/debate/enemies/test/enemy-attacks/a3.json: replies[3].quality must be ' +
        '"strong", "medium" or "weak" (is "great")',
    )
  })

  it('needs enough attacks for the rounds and the grid', () => {
    const problems = problemsFor((e) => {
      e.attacks.pop()
      e.playerAttacks.pop()
    })
    expect(problems).toEqual([
      'src/data/debate/enemies/test/player-attacks/: needs at least 6 player attacks to fill the grid (has 5)',
      'src/data/debate/enemies/test/enemy-attacks/: difficulty "normal" has 4 rounds, so the enemy ' +
        'needs at least 4 attacks (has 3)',
    ])
  })

  it('checks the config', () => {
    const cfg = testConfig()
    cfg.rules.replyMix = { strong: 1, medium: 1, weak: 1 }
    cfg.difficulty = 'nightmare'
    expect(problemsFor(() => {}, cfg)).toEqual([
      'src/data/debate/config.json: rules.replyMix adds up to 3 but rules.repliesPerAttack is 4',
      'src/data/debate/config.json: "difficulty" names "nightmare", which isn’t in "difficulties"',
      ...['a1', 'a2', 'a3', 'a4'].map(
        (id) =>
          `src/data/debate/enemies/test/enemy-attacks/${id}.json: replies need exactly ` +
          '1 strong, 1 medium, 1 weak (found 1 strong, 1 medium, 2 weak)',
      ),
    ])
  })

  it('reports missing UI strings', () => {
    const problems = validateDebate(testConfig(), [specEnemy()], {}).map(formatProblem)
    expect(problems).toContain('src/data/debate/ui.json: "prompt.reply" is missing')
  })
})

describe('assembleEnemies', () => {
  const enemyJson = {
    status: txt('s'),
    subject: txt('s'),
    appear: txt('a'),
    opening: txt('o'),
    sprite: 'x',
  }

  it('builds enemies from any path prefix and sorts the grid by order, then id', () => {
    const { enemies, problems } = assembleEnemies({
      '../../data/debate/enemies/foe/enemy.json': enemyJson,
      '../../data/debate/enemies/foe/enemy-attacks/b.json': {},
      'enemies/foe/player-attacks/zeta.json': {},
      'enemies/foe/player-attacks/alpha.json': {},
      'enemies/foe/player-attacks/last.json': { order: 2 },
      'enemies/foe/player-attacks/first.json': { order: 1 },
    })
    expect(problems).toEqual([])
    expect(enemies[0].id).toBe('foe')
    expect(enemies[0].attacks.map((a) => [a.id, a.source])).toEqual([
      ['b', 'enemies/foe/enemy-attacks/b.json'],
    ])
    expect(enemies[0].playerAttacks.map((a) => a.id)).toEqual(['first', 'last', 'alpha', 'zeta'])
  })

  it('reports stray files and a missing enemy.json', () => {
    const { enemies, problems } = assembleEnemies({
      'enemies/foe/attacks/x.json': {},
      'enemies/foe/notes.json': {},
      'enemies/ghost/enemy-attacks/y.json': {},
    })
    expect(enemies).toEqual([])
    expect(problems.map((p) => p.file)).toEqual([
      'enemies/foe/attacks/x.json',
      'enemies/foe/notes.json',
      'enemies/ghost/enemy.json',
    ])
  })
})

describe('text', () => {
  const strings = {
    'end.pointsWin': {
      fi: 'Voitit {playerScore}–{enemyScore}!',
      sv: 'TODO',
      en: 'You won {playerScore}–{enemyScore}!',
    },
    'enemy.used': {
      fi: '{enemy} käytti {attack}!',
      sv: '{enemy} använde {attack}!',
      en: '{enemy} used {attack}!',
    },
  }

  it('fills placeholders with numbers and localized texts', () => {
    const vars = { enemy: txt('Foe'), attack: txt('X') }
    expect(format({ key: 'enemy.used', vars }, 'sv', strings)).toBe('Foe sv använde X sv!')
    expect(
      format({ key: 'end.pointsWin', vars: { playerScore: 70, enemyScore: 40 } }, 'en', strings),
    ).toBe('You won 70–40!')
  })

  it('falls back to Finnish for TODO translations', () => {
    expect(
      format({ key: 'end.pointsWin', vars: { playerScore: 1, enemyScore: 0 } }, 'sv', strings),
    ).toBe('Voitit 1–0!')
    expect(localize({ fi: 'Moi', sv: '', en: 'Hi' }, 'sv')).toBe('Moi')
  })

  it('throws on unknown keys', () => {
    expect(() => format({ key: 'nope' }, 'fi', strings)).toThrow('Unknown debate UI key "nope"')
  })
})

describe('translationStatus', () => {
  it('counts TODOs and needsReview, including file-level flags', () => {
    const status = translationStatus({
      'a.json': { needsReview: ['sv'], x: txt('x'), list: [{ y: txt('y') }] },
      'b.json': { z: { fi: 'z', sv: 'TODO', en: 'z', needsReview: ['en'] } },
    })
    expect(status.todo).toEqual(['b.json'])
    expect(status.review).toEqual({ fi: 0, sv: 2, en: 1 })
  })
})
