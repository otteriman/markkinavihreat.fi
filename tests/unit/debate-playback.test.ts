import { describe, expect, it } from 'vitest'
import { chooseAttack, chooseReply, startBattle } from '../../src/lib/debate/battle'
import { ui } from '../../src/lib/debate/data'
import { planSteps, type Step } from '../../src/lib/debate/playback'
import { seededRng } from '../../src/lib/debate/rng'
import { specDifficulty, specEnemy, testSpecial } from './debate-fixtures'

const enemy = specEnemy()
const plan = (events: Parameters<typeof planSteps>[0]) => planSteps(events, 'fi', ui, enemy)

/**
 * Compact form: "type:bottom", "wait:advance", "hit:player", "prompt:reply",
 * "end", and for labels the boxes they change: "tags:top", "tags:top,bottom".
 */
const shape = (steps: Step[]) =>
  steps.map((s) =>
    s.kind === 'tags'
      ? `tags:${(['top', 'bottom'] as const).filter((b) => b in s).join(',')}`
      : s.kind === 'clear'
        ? `clear:${s.box}`
        : s.kind === 'exit'
          ? `exit:${s.who}`
          : s.kind === 'type'
            ? `type:${s.box}`
            : s.kind === 'wait'
              ? `wait:${s.until}`
              : s.kind === 'hit'
                ? `hit:${s.target}`
                : s.kind === 'prompt'
                  ? `prompt:${s.prompt.kind}`
                  : s.kind,
  )

function battle() {
  const rng = seededRng(5)
  const start = startBattle({ enemy, difficulty: specDifficulty(), attackSlots: 6, rng })
  return { rng, start }
}

describe('planSteps', () => {
  it('opening: each line waits for the player; the prompt becomes the grid’s label', () => {
    const { start } = battle()
    const steps = plan(start.events)
    expect(shape(steps)).toEqual([
      'enter', // both sides slide in
      'type:bottom', // Villi … ilmestyi!
      'wait:advance',
      'type:top', // opening line
      'wait:advance',
      'clear:top', // a new round (not announced) empties the enemy's box…
      'tags:top,bottom', // …and clears both labels
      'type:bottom', // … käytti …!
      'wait:advance',
      'tags:top', // Hyökkäys: <attack>
      'type:top', // attack line
      'wait:advance',
      'tags:bottom', // Millä teemalla vastaat?
      'prompt:reply',
    ])
    const tags = steps.filter((s) => s.kind === 'tags')
    const attack = start.state.enemyAttacks[0]
    expect(tags[1]).toEqual({ kind: 'tags', top: `Hyökkäys: ${attack.name.fi}` })
    expect(tags[2]).toEqual({
      kind: 'tags',
      bottom: 'Millä teemalla vastaat?',
      announce: 'Millä teemalla vastaat?',
    })
  })

  it('without the attack narration: no "käytti" line, a fresh bottom box, the label read out', () => {
    const { start } = battle()
    const steps = planSteps(start.events, 'fi', ui, enemy, { announceEnemyAttack: false })
    expect(shape(steps)).toEqual([
      'enter',
      'type:bottom', // Villi … ilmestyi!
      'wait:advance',
      'type:top', // opening line
      'wait:advance',
      'clear:top',
      'tags:top,bottom',
      'clear:bottom', // the last exchange's text goes; nothing replaces it
      'tags:top', // Hyökkäys: <attack>
      'type:top', // attack line
      'wait:advance',
      'tags:bottom', // Millä teemalla vastaat?
      'prompt:reply',
    ])
    const attack = start.state.enemyAttacks[0]
    expect(steps.some((s) => s.kind === 'type' && s.text.includes('käytti'))).toBe(false)
    expect(steps.find((s) => s.kind === 'type' && s.text === attack.line.fi)).toMatchObject({
      announce: `Hyökkäys: ${attack.name.fi}. subject fi: ${attack.line.fi}`,
    })
  })

  it('a reply: lines, then the effect text with the hit before the wait', () => {
    const { start } = battle()
    const index = start.state.enemyAttacks[0].replies.findIndex((r) => r.quality === 'medium')
    const steps = plan(chooseReply(start.state, index).events)
    expect(shape(steps)).toEqual([
      'tags:bottom', // Vastaus: <reply>
      'type:bottom', // the player's line
      'wait:advance',
      'type:top', // the enemy's reaction
      'wait:advance',
      'type:bottom', // Torjuit osan hänen hyökkäyksestään!
      'hit:player',
      'wait:advance',
      'tags:bottom', // Millä teemalla hyökkäät?
      'prompt:attack',
    ])
    const label = start.state.enemyAttacks[0].replies[index].label.fi
    expect(steps[0]).toEqual({ kind: 'tags', bottom: `Vastaus: ${label}` })
    expect(steps.at(-2)).toMatchObject({ bottom: 'Millä teemalla hyökkäät?' })
    const hit = steps.find((s) => s.kind === 'hit')
    expect(hit).toMatchObject({ damage: 15, from: 100, to: 85, announce: 'Sinä: kannatus 85' })
  })

  it('an attack: the player’s attack label, then the enemy’s defense label', () => {
    const { rng, start } = battle()
    const afterReply = chooseReply(start.state, 0).state
    const steps = plan(chooseAttack(afterReply, 'vahva1', rng).events)
    expect(steps.slice(0, 6)).toMatchObject([
      // The enemy's previous line and its label go when the player attacks.
      { kind: 'clear', box: 'top' },
      { kind: 'tags', top: null, bottom: 'Hyökkäys: vahva1 label fi' },
      { kind: 'type', box: 'bottom', text: 'vahva1 say fi' },
      { kind: 'wait', until: 'advance' },
      { kind: 'tags', top: 'Puolustus' },
      { kind: 'type', box: 'top' },
    ])
  })

  it('names the speaker for screen readers and localizes', () => {
    const { start } = battle()
    const steps = planSteps(start.events, 'en', ui, enemy)
    const top = steps.find((s) => s.kind === 'type' && s.box === 'top')
    expect(top).toMatchObject({ text: 'opening en', announce: 'subject en: opening en' })
  })

  it('clears the enemy’s box when a new round starts', () => {
    const { rng, start } = battle()
    const afterReply = chooseReply(start.state, 0).state
    const steps = plan(chooseAttack(afterReply, 'vahva1', rng).events)
    const round = steps.findIndex((s) => s.kind === 'type' && s.text.includes('käytti'))
    expect(steps.some((s) => s.kind === 'type' && s.text.includes('KIERROS'))).toBe(false)
    expect(steps.slice(round - 2, round)).toEqual([
      { kind: 'clear', box: 'top' },
      { kind: 'tags', top: null, bottom: null },
    ])
  })

  it('a knockout win: he slides out, then his defeat line', () => {
    const difficulty = { ...specDifficulty(), enemy: { ...specDifficulty().enemy, kannatus: 1 } }
    const rng = seededRng(1)
    const start = startBattle({ enemy, difficulty, attackSlots: 6, rng })
    const afterReply = chooseReply(start.state, 0).state
    // Every defense lands at least half a hit, more than his 1 point.
    const weights = { strong: 0, medium: 1, weak: 1 }
    const steps = plan(
      chooseAttack(
        { ...afterReply, difficulty: { ...difficulty, enemyDefenseWeights: weights } },
        'vahva1',
        rng,
      ).events,
    )
    expect(shape(steps).slice(-8)).toEqual([
      'wait:advance', // after the effect text and hit
      'clear:top', // his box and the labels go…
      'tags:top,bottom',
      'exit:enemy', // …and he slides out
      'tags:top,bottom',
      'type:bottom', // his defeat line
      'wait:advance',
      'end',
    ])
    expect(steps.at(-3)).toMatchObject({ text: 'defeat fi' })
    expect(steps.at(-1)).toMatchObject({
      kind: 'end',
      text: 'defeat fi',
      result: { kind: 'koWin' },
    })
  })

  it('ends with the end narration, its wait, and the result', () => {
    const difficulty = { ...specDifficulty(), player: { ...specDifficulty().player, kannatus: 30 } }
    const rng = seededRng(1)
    const start = startBattle({ enemy, difficulty, attackSlots: 6, rng })
    const weak = start.state.enemyAttacks[0].replies.findIndex((r) => r.quality === 'weak')
    const steps = plan(chooseReply(start.state, weak).events)
    expect(shape(steps).slice(-7)).toEqual([
      'hit:player',
      'wait:advance',
      'tags:top,bottom', // the ending clears both labels
      'type:bottom', // Silmissäsi pimenee...
      'wait:advance',
      'irisOut', // the screen closes to dark
      'end', // Kannatuksesi romahti. Heräät puoluetoimistolta.
    ])
    expect(steps.at(-4)).toMatchObject({ kind: 'type', text: 'Silmissäsi pimenee...' })
    expect(steps.at(-1)).toMatchObject({
      kind: 'end',
      text: 'Kannatuksesi romahti. Heräät puoluetoimistolta.',
      result: { kind: 'koLose' },
    })
  })

  it('a critical hit: the cut-in, his line under his name, then the hit', () => {
    const editor = testSpecial()
    const critEnemy = specEnemy()
    const say = { fi: 'editor line fi', sv: 'editor line sv', en: 'editor line en' }
    for (const a of critEnemy.attacks)
      for (const r of a.replies) r.critical = { by: 'editor', say, chance: 1 }
    const difficulty = { ...specDifficulty(), critical: { chance: 1, extraMin: 5, extraMax: 5 } }
    const start = startBattle({
      enemy: critEnemy,
      difficulty,
      attackSlots: 6,
      rng: seededRng(5),
      specials: { editor },
    })
    const weak = start.state.enemyAttacks[0].replies.findIndex((r) => r.quality === 'weak')
    const steps = planSteps(
      chooseReply(start.state, weak, seededRng(1)).events,
      'fi',
      ui,
      critEnemy,
    )
    expect(shape(steps)).toEqual([
      'tags:bottom', // Vastaus: <reply>
      'type:bottom', // the player's line
      'wait:advance',
      'type:top', // the enemy's reaction
      'wait:advance',
      'cutIn', // the stage puts his box and the labels aside
      'type:bottom', // Pääkirjoitustoimittaja astuu esiin!
      'wait:advance',
      'tags:top', // his name
      'type:top', // his line
      'wait:advance',
      'cutOut', // …and brings them back
      'type:bottom', // Puolustuksesi ei tehonnut lainkaan!
      'wait:advance',
      'type:bottom', // Kriittinen osuma!
      'hit:player',
      'wait:advance',
      'tags:bottom',
      'prompt:attack',
    ])
    expect(steps[5]).toEqual({ kind: 'cutIn', special: 'editor' })
    expect(steps[8]).toEqual({ kind: 'tags', top: 'editor name fi' })
    expect(steps[9]).toMatchObject({
      text: 'editor line fi',
      announce: 'editor name fi: editor line fi',
    })
    expect(steps[14]).toMatchObject({ text: 'Kriittinen osuma!' })
    expect(steps[15]).toMatchObject({ kind: 'hit', damage: 35, critical: true })
  })
})
