import type { Locale } from '../../lib/content'
import { chooseAttack, chooseReply, startBattle, type BattleResult } from '../../lib/debate/battle'
import { config, enemies, ui } from '../../lib/debate/data'
import { resolveDifficulty } from '../../lib/debate/difficulty'
import { planSteps, type Step } from '../../lib/debate/playback'
import type { Rng } from '../../lib/debate/rng'
import type { Difficulty } from '../../lib/debate/types'
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
}

/**
 * Plays one battle on a stage rendered by DebateGame.astro (`root` is its
 * `[data-debate]` element) and resolves with the result once the player
 * leaves the end screen. The same call serves the standalone page (init.ts
 * loops it for "Play again") and any page that embeds the game later.
 */
export async function playDebate(root: HTMLElement, options: PlayOptions): Promise<BattleResult> {
  const enemy = options.enemy ? enemies.find((e) => e.id === options.enemy) : enemies[0]
  if (!enemy) throw new Error(`Unknown debate enemy "${options.enemy}"`)
  const difficulty = options.difficulty ?? resolveDifficulty(config)
  const rng = options.rng ?? Math.random
  const view = new StageView(root, {
    locale: options.locale,
    ui,
    reduce: options.reduceMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
    msPerChar: config.typing.msPerChar,
    signal: options.signal ?? new AbortController().signal,
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
        case 'hit':
          await view.hit(step)
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
  })
  for (;;) {
    const stop = await perform(planSteps(events, options.locale, ui, enemy))
    if (stop.kind === 'end') {
      await view.showEnd(stop)
      return stop.result
    }
    const choice = await view.choose(stop.prompt)
    ;({ state, events } =
      stop.prompt.kind === 'reply'
        ? chooseReply(state, choice as number)
        : chooseAttack(state, choice as string, rng))
  }
}
