import { describe, expect, it } from 'vitest'
import { enemies, ui } from '../../src/lib/debate/data'
import { checkSprite, SPRITES, spriteSvg, SpriteError } from '../../src/lib/debate/sprites'
import { longestTexts, stageTexts } from '../../src/lib/debate/stageTexts'
import { validateDebate, formatProblem } from '../../src/lib/debate/validate'
import { stageScale } from '../../src/scripts/debate/scale'
import { specEnemy, testConfig } from './debate-fixtures'

describe('sprites', () => {
  it('are all well-formed grids', () => {
    for (const [name, sprite] of Object.entries(SPRITES)) {
      expect(() => checkSprite(name, sprite)).not.toThrow()
    }
  })

  it('reject uneven rows and unknown characters', () => {
    expect(() => checkSprite('x', { rows: ['..', '...'] })).toThrow('row 1 is 3 wide, expected 2')
    expect(() => checkSprite('x', { rows: ['.4'] })).toThrow('row 0 has "4"')
  })

  it('render runs of one shade as single rects, skipping transparent pixels', () => {
    SPRITES.__test = { rows: ['.33.', '0000'] }
    try {
      expect(spriteSvg('__test')).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 2" width="4" height="2" ' +
          'shape-rendering="crispEdges" aria-hidden="true">' +
          '<rect class="s3" x="1" y="0" width="2" height="1"/>' +
          '<rect class="s0" x="0" y="1" width="4" height="1"/></svg>',
      )
      expect(spriteSvg('__test', 'A "label"')).toContain(
        'role="img" aria-label="A &quot;label&quot;"',
      )
    } finally {
      delete SPRITES.__test
    }
  })

  it('throw on unknown names', () => {
    expect(() => spriteSvg('nobody')).toThrow(SpriteError)
  })

  it('must exist for every enemy (validator)', () => {
    const enemy = { ...specEnemy(), sprite: 'nobody' }
    expect(validateDebate(testConfig(), [enemy], ui).map(formatProblem)).toContain(
      'src/data/debate/enemies/test/enemy.json: sprite "nobody" doesn’t exist in src/lib/debate/sprites.ts',
    )
  })
})

describe('stageScale', () => {
  it('uses whole numbers from 2× up', () => {
    expect(stageScale(1280, 1100)).toBe(4)
    expect(stageScale(1000, 820)).toBe(3)
    expect(stageScale(700, 2000)).toBe(2)
  })

  it('uses eighths below 2× so phones aren’t stuck at 1×', () => {
    expect(stageScale(390, 844)).toBe(1.625)
    expect(stageScale(360, 640)).toBe(1.5)
  })

  it('never goes below 1×', () => {
    expect(stageScale(200, 200)).toBe(1)
  })
})

describe('stageTexts', () => {
  const texts = stageTexts(enemies, ui)

  it('covers every language and box', () => {
    for (const locale of ['fi', 'sv', 'en'] as const) {
      for (const box of ['top', 'bottom', 'label', 'status', 'tag'] as const) {
        expect(texts.some((t) => t.locale === locale && t.box === box)).toBe(true)
      }
    }
  })

  it('puts the enemy’s lines in the top box and replies in the grid', () => {
    const attack = enemies[0].attacks[0]
    expect(texts).toContainEqual({
      box: 'top',
      locale: 'fi',
      text: attack.line.fi,
      source: `${attack.id}.json line`,
    })
    expect(texts).toContainEqual({
      box: 'label',
      locale: 'sv',
      text: attack.replies[0].label.sv,
      source: `${attack.id}.json replies[0].label`,
    })
  })

  it('fills placeholders, so measured texts are what players see', () => {
    expect(texts.some((t) => t.text.includes('{'))).toBe(false)
  })

  it('finds the longest text per box', () => {
    const longest = longestTexts(texts, 'fi')
    const labels = texts.filter((t) => t.locale === 'fi' && t.box === 'label')
    expect(longest.label.length).toBe(Math.max(...labels.map((t) => t.text.length)))
  })
})
