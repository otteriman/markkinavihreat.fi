import { describe, expect, it } from 'vitest'
import { chooseAttack, chooseReply, startBattle } from '../../src/lib/debate/battle'
import { ui } from '../../src/lib/debate/data'
import { planSteps, type Step } from '../../src/lib/debate/playback'
import { seededRng } from '../../src/lib/debate/rng'
import { specDifficulty, specEnemy } from './debate-fixtures'

const enemy = specEnemy()
const plan = (events: Parameters<typeof planSteps>[0]) => planSteps(events, 'fi', ui, enemy)

/** Compact form: "type:bottom", "wait:advance", "hit:player", "prompt:reply", "end". */
const shape = (steps: Step[]) =>
  steps.map((s) =>
    s.kind === 'type'
      ? `type:${s.box}`
      : s.kind === 'wait'
        ? `wait:${s.until}`
        : s.kind === 'hit'
          ? `hit:${s.target}`
          : s.kind === 'prompt'
            ? `prompt:${s.prompt.kind}`
            : 'end',
  )

function battle() {
  const rng = seededRng(5)
  const start = startBattle({ enemy, difficulty: specDifficulty(), attackSlots: 6, rng })
  return { rng, start }
}

describe('planSteps', () => {
  it('opening: each line waits for the player, the prompt only pauses before the grid', () => {
    const { start } = battle()
    expect(shape(plan(start.events))).toEqual([
      'type:bottom', // Villi … ilmestyi!
      'wait:advance',
      'type:top', // opening line
      'wait:advance',
      'type:bottom', // KIERROS 1/4
      'wait:advance',
      'type:bottom', // … käytti …!
      'wait:advance',
      'type:top', // attack line
      'wait:advance',
      'type:bottom', // Miten vastaat?
      'wait:pause',
      'prompt:reply',
    ])
  })

  it('a reply: lines, then the effect text with the hit before the wait', () => {
    const { start } = battle()
    const index = start.state.enemyAttacks[0].replies.findIndex((r) => r.quality === 'medium')
    const steps = plan(chooseReply(start.state, index).events)
    expect(shape(steps)).toEqual([
      'type:bottom', // the player's line
      'wait:advance',
      'type:top', // the enemy's reaction
      'wait:advance',
      'type:bottom', // Torjuit osan hyökkäyksestä!
      'hit:player',
      'wait:advance',
      'type:bottom', // Millä hyökkäät?
      'wait:pause',
      'prompt:attack',
    ])
    const hit = steps.find((s) => s.kind === 'hit')
    expect(hit).toMatchObject({ damage: 15, from: 100, to: 85, announce: 'Sinä: kannatus 85' })
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
    const round = steps.find((s) => s.kind === 'type' && s.text === 'KIERROS 2/4')
    expect(round).toMatchObject({ clearTop: true })
  })

  it('ends with the end narration, its wait, and the result', () => {
    const difficulty = { ...specDifficulty(), player: { ...specDifficulty().player, kannatus: 30 } }
    const rng = seededRng(1)
    const start = startBattle({ enemy, difficulty, attackSlots: 6, rng })
    const weak = start.state.enemyAttacks[0].replies.findIndex((r) => r.quality === 'weak')
    const steps = plan(chooseReply(start.state, weak).events)
    expect(shape(steps).slice(-5)).toEqual([
      'hit:player',
      'wait:advance',
      'type:bottom', // Kannatuksesi romahti...
      'wait:advance',
      'end',
    ])
    const end = steps.at(-1)
    expect(end).toMatchObject({
      kind: 'end',
      text: 'Kannatuksesi romahti... Heräät puoluetoimistolta.',
      result: { kind: 'koLose' },
    })
  })
})
