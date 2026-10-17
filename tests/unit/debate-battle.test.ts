import { describe, expect, it } from 'vitest'
import {
  attackOptions,
  BattleError,
  chooseAttack,
  chooseReply,
  currentAttack,
  startBattle,
  type BattleEvent,
  type BattleState,
} from '../../src/lib/debate/battle'
import { seededRng, type Rng } from '../../src/lib/debate/rng'
import type { Difficulty, Quality } from '../../src/lib/debate/types'
import { playerAttack, specDifficulty, specEnemy, testSpecial, txt } from './debate-fixtures'

const start = (
  difficulty: Difficulty = specDifficulty(),
  rng: Rng = seededRng(1),
  enemy = specEnemy(),
) => startBattle({ enemy, difficulty, attackSlots: 6, rng })

/** No round limit to speak of, and plenty of KANNATUS. */
const endless = (): Difficulty => ({
  ...specDifficulty(),
  maxRounds: 50,
  player: { ...specDifficulty().player, kannatus: 1000 },
  enemy: { ...specDifficulty().enemy, kannatus: 1000 },
})
const noDamage = { strong: 0, medium: 0, weak: 0 }

const replyOf = (state: BattleState, quality: Quality) =>
  currentAttack(state).replies.findIndex((r) => r.quality === quality)

/** Plays a whole battle with fixed choices; returns every event. */
function play(
  reply: Quality,
  attacks: string[],
  difficulty = specDifficulty(),
  rng: Rng = seededRng(1),
) {
  let step = start(difficulty, rng)
  const events: BattleEvent[] = [...step.events]
  let i = 0
  while (step.state.phase !== 'over') {
    step =
      step.state.phase === 'reply'
        ? chooseReply(step.state, replyOf(step.state, reply))
        : chooseAttack(step.state, attacks[i++], rng)
    events.push(...step.events)
  }
  return { state: step.state, events }
}

const keys = (events: BattleEvent[]) =>
  events.map((e) =>
    e.type === 'narrate'
      ? 'key' in e.message
        ? e.message.key
        : 'text'
      : e.type === 'say'
        ? `say:${e.who}`
        : e.type === 'phase'
          ? `phase:${e.phase}`
          : e.type === 'turn'
            ? `turn:${e.who}${e.first ? ':first' : ''}`
            : e.type,
  )

describe('battle flow', () => {
  it('opens with the intro, round 1, the enemy attack and a reply prompt', () => {
    const { state, events } = start()
    expect(keys(events)).toEqual([
      'enter',
      'text',
      'say:enemy',
      'phase:newRound',
      'turn:enemy:first', // Kansalliskonservatiivi aloittaa väittelyn.
      'enemy.used',
      'phase:enemyAttack',
      'say:enemy',
      'prompt.reply',
      'prompt',
    ])
    expect(events[6]).toMatchObject({ name: state.enemyAttacks[0].name })
    expect(state.phase).toBe('reply')
    const prompt = events.at(-1)
    expect(prompt).toMatchObject({ type: 'prompt', kind: 'reply' })
    if (prompt?.type === 'prompt') expect(prompt.options).toHaveLength(4)
  })

  it('after a reply: player line, enemy reaction, effect, hit, then the attack prompt', () => {
    const { state } = start()
    const { events, state: next } = chooseReply(state, replyOf(state, 'medium'))
    expect(keys(events)).toEqual([
      'phase:reply',
      'say:player',
      'say:enemy',
      'effect.defend.medium',
      'hit',
      'turn:player', // Sinun vuorosi valita puheenaihe.
      'prompt.attack',
      'prompt',
    ])
    expect(events[0]).toMatchObject({
      name: state.enemyAttacks[0].replies[replyOf(state, 'medium')].label,
    })
    expect(events[4]).toMatchObject({ target: 'player', damage: 15, from: 100, to: 85 })
    expect(next.phase).toBe('attack')
  })

  it('a later round starts with the enemy changing the subject', () => {
    const { state } = start()
    const afterReply = chooseReply(state, replyOf(state, 'strong')).state
    const { events } = chooseAttack(afterReply, 'hyva1', seededRng(4))
    const turns = events.filter((e) => e.type === 'turn')
    expect(turns).toEqual([{ type: 'turn', who: 'enemy', first: false }])
  })

  it('after an attack: the player’s attack phase, then the enemy’s defense phase', () => {
    const { state } = start()
    const afterReply = chooseReply(state, replyOf(state, 'strong')).state
    const { events } = chooseAttack(afterReply, 'hyva1', seededRng(4))
    expect(keys(events).slice(0, 4)).toEqual([
      'phase:playerAttack',
      'say:player',
      'phase:enemyDefense',
      'say:enemy',
    ])
    expect(events[0]).toMatchObject({ name: { fi: 'hyva1 label fi' } })
  })

  it('uses each enemy attack at most once and shuffles the reply order', () => {
    const seen = new Set<string>()
    let shuffled = false
    for (let seed = 1; seed <= 50; seed++) {
      const { events } = play(
        'strong',
        ['vahva1', 'vahva2', 'hyva1', 'hyva2'],
        specDifficulty(),
        seededRng(seed),
      )
      const used = events.flatMap((e) =>
        e.type === 'narrate' && 'key' in e.message && e.message.key === 'enemy.used'
          ? [JSON.stringify(e.message.vars?.attack)]
          : [],
      )
      expect(new Set(used).size).toBe(4)
      used.forEach((u) => seen.add(u))
      const prompt = events.find((e) => e.type === 'prompt' && e.kind === 'reply')
      if (
        prompt?.type === 'prompt' &&
        prompt.options.some((o, i) => 'index' in o && o.index !== i)
      ) {
        shuffled = true
      }
    }
    expect(seen.size).toBe(4)
    expect(shuffled).toBe(true)
  })

  it('deals enemy attacks from shuffled decks: all before any repeat, never twice in a row', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = seededRng(seed)
      // Lots of KANNATUS and no damage, so the battle runs for many rounds.
      const difficulty = { ...endless(), player: { ...endless().player, damage: noDamage } }
      let { state } = start(difficulty, rng)
      const seen: string[] = []
      while (state.round <= 12) {
        seen.push(currentAttack(state).id)
        state = chooseReply(state, 0).state
        state = chooseAttack(state, attackOptions(state)[0].id, rng).state
      }
      for (let deck = 0; deck < 3; deck++) {
        expect(new Set(seen.slice(deck * 4, deck * 4 + 4)).size).toBe(4)
      }
      seen.slice(1).forEach((id, i) => expect(id).not.toBe(seen[i]))
    }
  })

  it('frees the player’s attacks once all six are used', () => {
    const rng = seededRng(3)
    let { state } = start({ ...endless(), player: { ...endless().player, damage: noDamage } }, rng)
    for (let round = 1; round <= 6; round++) {
      state = chooseReply(state, 0).state
      state = chooseAttack(state, attackOptions(state)[0].id, rng).state
    }
    state = chooseReply(state, 0).state
    expect(attackOptions(state)).toHaveLength(6)
  })

  /** The fixture enemy with three more attacks: nine in the pool, a grid of six. */
  const nineAttacks = () => {
    const enemy = specEnemy()
    enemy.playerAttacks = [
      ...enemy.playerAttacks,
      playerAttack('extra1', ['strong', 'weak', 'weak', 'weak'], 7),
      playerAttack('extra2', ['strong', 'weak', 'medium', 'weak'], 8),
      playerAttack('extra3', ['strong', 'strong', 'weak', 'weak'], 9),
    ]
    return enemy
  }

  it('offers six random attacks from a bigger pool each round, in grid order', () => {
    const offers = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const enemy = nineAttacks()
      const { state } = startBattle({
        enemy,
        difficulty: specDifficulty(),
        attackSlots: 6,
        rng: seededRng(seed),
      })
      expect(state.playerAttacks).toHaveLength(9)
      const options = attackOptions(chooseReply(state, 0).state)
      expect(options).toHaveLength(6)
      const order = options.map((o) => enemy.playerAttacks.findIndex((a) => a.id === o.id))
      expect(order).toEqual([...order].sort((a, b) => a - b))
      offers.add(options.map((o) => o.id).join())
    }
    expect(offers.size).toBeGreaterThan(5)
  })

  it('never offers a used attack; offers what is left, then refills the pool', () => {
    const rng = seededRng(4)
    const difficulty = { ...endless(), player: { ...endless().player, damage: noDamage } }
    let { state } = startBattle({ enemy: nineAttacks(), difficulty, attackSlots: 6, rng })
    const sizes: number[] = []
    for (let round = 1; round <= 10; round++) {
      state = chooseReply(state, 0).state
      const options = attackOptions(state)
      sizes.push(options.length)
      expect(options.some((o) => state.used.includes(o.id))).toBe(false)
      state = chooseAttack(state, options[0].id, rng).state
    }
    // 9 unused, 8, 7, 6: a full grid; then 5, 4, 3, 2, 1 left; then the pool refills.
    expect(sizes).toEqual([6, 6, 6, 6, 5, 4, 3, 2, 1, 6])
  })

  it('rejects a used attack and one that isn’t offered', () => {
    const { state } = startBattle({
      enemy: nineAttacks(),
      difficulty: specDifficulty(),
      attackSlots: 6,
      rng: seededRng(2),
    })
    const afterReply = chooseReply(state, replyOf(state, 'strong')).state
    const offered = attackOptions(afterReply).map((o) => o.id)
    const missing = afterReply.playerAttacks.find((a) => !offered.includes(a.id))!.id
    expect(() => chooseAttack(afterReply, missing, seededRng(1))).toThrow('isn’t offered')
    const rng = seededRng(2)
    const afterAttack = chooseAttack(afterReply, offered[0], rng).state
    const back = chooseReply(afterAttack, replyOf(afterAttack, 'strong')).state
    expect(attackOptions(back).map((o) => o.id)).not.toContain(offered[0])
    expect(() => chooseAttack(back, offered[0], rng)).toThrow('already used')
  })

  it('rejects choices out of turn and unknown ids', () => {
    const { state } = start()
    expect(() => chooseAttack(state, 'vahva1', seededRng(1))).toThrow(BattleError)
    expect(() => chooseReply(state, 9)).toThrow('No reply 9')
    const attackPhase = chooseReply(state, 0).state
    expect(() => chooseReply(attackPhase, 0)).toThrow('Not waiting for a reply')
    expect(() => chooseAttack(attackPhase, 'nope', seededRng(1))).toThrow('No player attack "nope"')
  })

  it('is deterministic for a seed', () => {
    const a = play(
      'medium',
      ['hyva1', 'vahva1', 'heikko1', 'vahva2'],
      specDifficulty(),
      seededRng(42),
    )
    const b = play(
      'medium',
      ['hyva1', 'vahva1', 'heikko1', 'vahva2'],
      specDifficulty(),
      seededRng(42),
    )
    expect(a.events).toEqual(b.events)
  })
})

describe('backfire (counter damage)', () => {
  const withCounter = (): Difficulty => ({
    ...specDifficulty(),
    player: { ...specDifficulty().player, counter: 0.5 },
    enemy: { ...specDifficulty().enemy, counter: 0.5 },
  })

  it('a perfect reply makes the enemy’s attack backfire on him', () => {
    const { state } = start(withCounter())
    const { state: next, events } = chooseReply(state, replyOf(state, 'strong'))
    expect(events.find((e) => e.type === 'hit')).toMatchObject({
      target: 'enemy',
      damage: 15,
      from: 100,
      to: 85,
      counter: true,
    })
    expect(keys(events)).toContain('effect.defend.backfire')
    expect([next.player, next.enemyKannatus]).toEqual([100, 85])
  })

  it('a perfect defense makes the player’s attack backfire on the player', () => {
    const difficulty = { ...withCounter(), enemyDefenseWeights: { strong: 1, medium: 0, weak: 0 } }
    const { state } = start(difficulty)
    const afterReply = chooseReply(state, replyOf(state, 'medium')).state
    const { events } = chooseAttack(afterReply, 'heikko1', seededRng(2))
    expect(events.find((e) => e.type === 'hit')).toMatchObject({
      target: 'player',
      damage: 15,
      from: 85,
      to: 70,
      counter: true,
    })
    expect(keys(events)).toContain('effect.attack.backfire')
  })

  it('without counter damage a perfect defense just blocks', () => {
    const { state } = start()
    const { events } = chooseReply(state, replyOf(state, 'strong'))
    expect(events.find((e) => e.type === 'hit')).toMatchObject({
      target: 'player',
      damage: 0,
      counter: false,
    })
    expect(keys(events)).toContain('effect.defend.strong')
  })

  it('a backfire can knock the attacker out', () => {
    const difficulty = withCounter()
    difficulty.player.kannatus = 15
    const strongDefense = { ...difficulty, enemyDefenseWeights: { strong: 1, medium: 0, weak: 0 } }
    const { state } = start(strongDefense)
    const afterReply = chooseReply(state, replyOf(state, 'strong')).state
    const { state: over } = chooseAttack(afterReply, 'vahva1', seededRng(1))
    expect(over.result).toMatchObject({ kind: 'koLose', player: 0 })
  })

  it('battles run until a knockout, often past four rounds', () => {
    const difficulty = { ...withCounter(), maxRounds: 50 }
    let longer = 0
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed)
      let { state } = start(difficulty, rng)
      while (state.phase !== 'over') {
        state =
          state.phase === 'reply'
            ? chooseReply(state, replyOf(state, 'medium')).state
            : chooseAttack(state, attackOptions(state)[0].id, rng).state
      }
      expect(state.result!.kind).toMatch(/^ko/)
      if (state.round > 4) longer++
    }
    expect(longer).toBeGreaterThan(0)
  })
})

describe('battle endings', () => {
  it('ends at once on a player KO, before the player attacks', () => {
    const difficulty = { ...specDifficulty(), player: { ...specDifficulty().player, kannatus: 30 } }
    const { state } = start(difficulty)
    const { state: after, events } = chooseReply(state, replyOf(state, 'weak'))
    expect(after.phase).toBe('over')
    expect(after.result).toMatchObject({
      kind: 'koLose',
      player: 0,
      repliesGiven: 1,
      strongReplies: 0,
    })
    expect(keys(events).slice(-2)).toEqual(['end.koLose', 'end'])
  })

  it('ends at once on an enemy KO', () => {
    const difficulty: Difficulty = {
      ...specDifficulty(),
      enemy: { ...specDifficulty().enemy, kannatus: 1, damage: { strong: 1, medium: 1, weak: 1 } },
    }
    const { state } = start(difficulty)
    const afterReply = chooseReply(state, replyOf(state, 'strong')).state
    const { state: after, events } = chooseAttack(afterReply, 'vahva1', seededRng(1))
    expect(after.result).toMatchObject({ kind: 'koWin', enemy: 0, strongReplies: 1 })
    // He slides off the stage, then his own defeat line.
    expect(events.slice(-3)).toEqual([
      { type: 'exit', who: 'enemy' },
      { type: 'narrate', message: { text: specEnemy().defeat } },
      { type: 'end', result: after.result },
    ])
  })

  it('decides on points after the last round', () => {
    // Strong replies keep the player at 100; the defense weights fix the enemy's side.
    const tie = play('strong', ['vahva1', 'vahva2', 'hyva1', 'hyva2'], {
      ...specDifficulty(),
      enemyDefenseWeights: { strong: 1, medium: 0, weak: 0 },
    })
    expect(tie.state.result).toMatchObject({
      kind: 'tie',
      player: 100,
      enemy: 100,
      strongReplies: 4,
    })

    const win = play('strong', ['vahva1', 'vahva2', 'hyva1', 'hyva2'], {
      ...specDifficulty(),
      enemyDefenseWeights: { strong: 0, medium: 1, weak: 0 },
    })
    expect(win.state.result).toMatchObject({ kind: 'pointsWin', player: 100, enemy: 40 })
    const narration = win.events.find(
      (e) => e.type === 'narrate' && 'key' in e.message && e.message.key === 'end.pointsWin',
    )
    expect(narration).toMatchObject({ message: { vars: { playerScore: 100, enemyScore: 40 } } })

    const lose = play('medium', ['heikko1', 'heikko2', 'hyva1', 'hyva2'], {
      ...specDifficulty(),
      enemyDefenseWeights: { strong: 1, medium: 0, weak: 0 },
    })
    expect(lose.state.result).toMatchObject({ kind: 'pointsLose', player: 40, enemy: 100 })
  })

  it('counts a close result as a tie within tieMargin', () => {
    const difficulty = {
      ...specDifficulty(),
      tieMargin: 60,
      enemyDefenseWeights: { strong: 0, medium: 1, weak: 0 },
    }
    const { state } = play('strong', ['vahva1', 'vahva2', 'hyva1', 'hyva2'], difficulty)
    expect(state.result).toMatchObject({ kind: 'tie', player: 100, enemy: 40 })
  })
})

describe('critical hits (special characters)', () => {
  const editor = testSpecial()
  const critical = { chance: 0.5, extraMin: 5, extraMax: 10 }
  const line = { fi: 'editor line fi', sv: 'editor line sv', en: 'editor line en' }
  /** The fixture enemy, with a critical trigger on every reply and defense. */
  const enemyWithTriggers = (chance?: number) => {
    const enemy = specEnemy()
    const trigger = { by: 'editor', say: line, ...(chance === undefined ? {} : { chance }) }
    for (const a of enemy.attacks) for (const r of a.replies) r.critical = trigger
    for (const a of enemy.playerAttacks) for (const d of a.defenses) d.critical = trigger
    return enemy
  }
  const setup = (chance?: number, difficulty: Difficulty = { ...specDifficulty(), critical }) =>
    startBattle({
      enemy: enemyWithTriggers(chance),
      difficulty,
      attackSlots: 6,
      rng: seededRng(1),
      specials: { editor },
    })

  it('he steps in, speaks, leaves, and the hit does 5–10 more damage', () => {
    const { state } = setup(1)
    for (let seed = 1; seed <= 30; seed++) {
      const { events, state: next } = chooseReply(state, replyOf(state, 'weak'), seededRng(seed))
      expect(events.map((e) => e.type)).toEqual([
        'phase',
        'say',
        'say',
        'specialEnter',
        'narrate', // Pääkirjoitustoimittaja astuu esiin!
        'specialSay',
        'specialExit',
        'narrate', // the effect text
        'narrate', // Kriittinen osuma!
        'hit',
        'turn',
        'narrate',
        'prompt',
      ])
      expect(events[4]).toEqual({ type: 'narrate', message: { text: editor.appear } })
      expect(events[5]).toEqual({ type: 'specialSay', special: editor, text: line })
      expect(keys(events)).toContain('effect.critical')
      const hit = events.find((e) => e.type === 'hit')!
      expect(hit).toMatchObject({ target: 'player', critical: true, from: 100 })
      if (hit.type !== 'hit') throw new Error()
      expect(hit.extra).toBeGreaterThanOrEqual(5)
      expect(hit.extra).toBeLessThanOrEqual(10)
      expect(hit.damage).toBe(30 + hit.extra)
      expect(next.player).toBe(100 - hit.damage)
    }
  })

  it('uses the difficulty’s chance when the trigger sets none, about half the time', () => {
    const { state } = setup()
    let crits = 0
    for (let seed = 1; seed <= 400; seed++) {
      const { events } = chooseReply(state, replyOf(state, 'weak'), seededRng(seed))
      if (events.some((e) => e.type === 'specialEnter')) crits++
    }
    expect(crits / 400).toBeGreaterThan(0.4)
    expect(crits / 400).toBeLessThan(0.6)
  })

  it('never fires on a hit that does no damage, with chance 0, or without an rng', () => {
    const { state } = setup(1)
    const blocked = chooseReply(state, replyOf(state, 'strong'), seededRng(1)).events
    expect(blocked.some((e) => e.type === 'specialEnter')).toBe(false)
    const never = setup(0).state
    expect(
      chooseReply(never, replyOf(never, 'weak'), seededRng(1)).events.some(
        (e) => e.type === 'specialEnter',
      ),
    ).toBe(false)
    const noRng = chooseReply(state, replyOf(state, 'weak')).events
    expect(noRng.find((e) => e.type === 'hit')).toMatchObject({ damage: 30, critical: false })
  })

  it('never fires without critical settings in the difficulty', () => {
    const { state } = setup(1, specDifficulty())
    const { events } = chooseReply(state, replyOf(state, 'weak'), seededRng(1))
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ damage: 30, critical: false })
  })

  it('works on the enemy’s defenses too: the player’s attack hits harder', () => {
    const difficulty = {
      ...specDifficulty(),
      critical,
      enemyDefenseWeights: { strong: 0, medium: 0, weak: 1 },
    }
    const { state } = setup(1, difficulty)
    const afterReply = chooseReply(state, replyOf(state, 'strong'), seededRng(1)).state
    const { events } = chooseAttack(afterReply, 'vahva1', seededRng(3))
    expect(events.map((e) => e.type)).toContain('specialEnter')
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ target: 'enemy', critical: true })
  })

  it('with several triggers on one answer, one of them, picked at random, steps in', () => {
    const columnist = { ...editor, id: 'columnist', name: txt('columnist name') }
    const enemy = specEnemy()
    for (const a of enemy.attacks) {
      for (const r of a.replies) {
        r.critical = [
          { by: 'editor', say: txt('editor line') },
          { by: 'columnist', say: txt('columnist line') },
        ]
      }
    }
    const { state } = startBattle({
      enemy,
      difficulty: { ...specDifficulty(), critical: { chance: 1, extraMin: 5, extraMax: 10 } },
      attackSlots: 6,
      rng: seededRng(1),
      specials: { editor, columnist },
    })
    const seen = new Map<string, number>()
    for (let seed = 1; seed <= 200; seed++) {
      const { events } = chooseReply(state, replyOf(state, 'weak'), seededRng(seed))
      const say = events.find((e) => e.type === 'specialSay')
      expect(say, 'chance 1: someone always steps in').toBeDefined()
      if (say?.type !== 'specialSay') continue
      expect(say.text).toEqual(txt(`${say.special.id} line`))
      seen.set(say.special.id, (seen.get(say.special.id) ?? 0) + 1)
    }
    expect(seen.get('editor')).toBeGreaterThan(70)
    expect(seen.get('columnist')).toBeGreaterThan(70)
  })
})
