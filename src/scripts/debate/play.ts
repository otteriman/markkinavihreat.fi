import type { Locale } from '../../lib/content'
import {
  chooseAttack,
  chooseReply,
  currentAttack,
  startBattle,
  type BattleResult,
} from '../../lib/debate/battle'
import { config, enemies, specials, ui } from '../../lib/debate/data'
import { resolveDifficulty } from '../../lib/debate/difficulty'
import { planSteps, type Step } from '../../lib/debate/playback'
import type { Rng } from '../../lib/debate/rng'
import { specialScene } from '../../lib/debate/scenes'
import type { Difficulty } from '../../lib/debate/types'
import { silent, type Sounds } from './audio'
import { StageView } from './view'

export interface PlayOptions {
  locale: Locale
  /** Folder name under src/data/debate/enemies/; defaults to the first enemy. */
  enemy?: string
  /** Defaults to the shipped preset in config.json. */
  difficulty?: Difficulty
  /** Defaults to Math.random. */
  rng?: Rng
  /** Defaults to the player's prefers-reduced-motion setting. */
  reduceMotion?: boolean
  /** Aborting ends the battle at once and removes every listener; the promise rejects. */
  signal?: AbortSignal
  /** Sound effects; silent by default. */
  sounds?: Sounds
  /**
   * A preview scene (the lab's links): special character `special` always
   * steps in when called, the battle opens with an attack whose reply calls
   * him in, and the reply grid's cursor starts on that reply.
   */
  scene?: { special: string }
}

/**
 * Plays one battle on a stage rendered by DebateGame.astro (`root` is its
 * `[data-debate]` element) and resolves with the result once the player
 * leaves the end screen. The same call serves the standalone page (init.ts
 * loops it for "Play again") and any page that embeds the game later.
 */
export async function playDebate(root: HTMLElement, options: PlayOptions): Promise<BattleResult> {
  const found = options.enemy ? enemies.find((e) => e.id === options.enemy) : enemies[0]
  if (!found) throw new Error(`Unknown debate enemy "${options.enemy}"`)
  const scene = options.scene ? specialScene(found, options.scene.special) : null
  const enemy = scene?.enemy ?? found
  let difficulty = options.difficulty ?? resolveDifficulty(config)
  if (scene && !difficulty.critical) {
    difficulty = { ...difficulty, critical: { chance: 1, extraMin: 5, extraMax: 10 } }
  }
  const rng = options.rng ?? Math.random
  const view = new StageView(root, {
    locale: options.locale,
    ui,
    reduce: options.reduceMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
    msPerChar: config.typing.msPerChar,
    signal: options.signal ?? new AbortController().signal,
    sounds: options.sounds ?? silent,
  })

  /** Performs steps until the battle needs a choice or is over. */
  const perform = async (steps: Step[]) => {
    for (const step of steps) {
      switch (step.kind) {
        case 'type':
          await view.type(step)
          break
        case 'wait':
          await (step.until === 'advance' ? view.waitForAdvance() : view.pause())
          break
        case 'tags':
          view.setTags(step)
          break
        case 'clear':
          view.clear(step.box)
          break
        case 'enter':
          await view.enter()
          break
        case 'exit':
          await view.exit(step.who)
          break
        case 'hit':
          await view.hit(step)
          break
        case 'irisOut':
          await view.irisOut()
          break
        case 'cutIn':
          await view.cutIn(step.special)
          break
        case 'cutOut':
          await view.cutOut()
          break
        case 'prompt':
        case 'end':
          return step
      }
    }
    throw new Error('Debate battle events ended without a prompt or an end')
  }

  view.reset(difficulty)
  let { state, events } = startBattle({
    enemy,
    difficulty,
    attackSlots: config.rules.playerAttackSlots,
    rng,
    specials,
    firstAttack: scene?.firstAttack ?? undefined,
  })
  for (;;) {
    const stop = await perform(planSteps(events, options.locale, ui, enemy, config.presentation))
    if (stop.kind === 'end') {
      if (stop.result.kind === 'koLose' || stop.result.kind === 'pointsLose') {
        ;(options.sounds ?? silent).lose()
      }
      await view.showEnd(stop)
      return stop.result
    }
    // In a scene, the reply grid's cursor starts on the reply that calls him in.
    const sceneReply =
      options.scene && stop.prompt.kind === 'reply'
        ? currentAttack(state).replies.findIndex((r) => r.critical?.by === options.scene!.special)
        : -1
    const choice = await view.choose(stop.prompt, sceneReply >= 0 ? sceneReply : undefined)
    ;({ state, events } =
      stop.prompt.kind === 'reply'
        ? chooseReply(state, choice as number, rng)
        : chooseAttack(state, choice as string, rng))
  }
}
