import type { Locale } from '../../lib/content'
import { config } from '../../lib/debate/data'
import { DifficultyError, resolveDifficulty } from '../../lib/debate/difficulty'
import type { Difficulty } from '../../lib/debate/types'
import { playDebate } from './play'

/** How much of the stage must be on screen before the battle starts by itself. */
const VISIBLE_TO_START = 0.5

/**
 * The standalone game page: the battle starts by itself as soon as the stage
 * is (mostly) on screen, so its first lines aren't typed out below the fold,
 * and the end screen's "Play again" starts the next one straight away.
 */
export function startDebateGames(root: ParentNode): void {
  for (const frame of root.querySelectorAll<HTMLElement>('[data-debate-play]')) {
    const difficulty = pickDifficulty(frame)
    const run = async () => {
      for (;;) {
        await playDebate(frame, {
          locale: frame.lang as Locale,
          enemy: frame.dataset.debateEnemy,
          difficulty,
        })
      }
    }
    const stage = frame.querySelector('.debate-stage') ?? frame
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        void run()
      },
      { threshold: VISIBLE_TO_START },
    )
    observer.observe(stage)
  }
}

/**
 * The shipped difficulty, or in development and noindex previews (the frame
 * carries data-debate-difficulty-param) the one named by `?difficulty=`, so
 * testers can compare presets. Production pages never read the parameter.
 */
function pickDifficulty(frame: HTMLElement): Difficulty {
  const name =
    frame.dataset.debateDifficultyParam !== undefined
      ? new URLSearchParams(location.search).get('difficulty')
      : null
  if (!name) return resolveDifficulty(config)
  try {
    const difficulty = resolveDifficulty(config, name)
    const note = frame.querySelector<HTMLElement>('[data-debate-note]')
    if (note) {
      note.textContent = `Difficulty: ${name} (preview only)`
      note.hidden = false
    }
    return difficulty
  } catch (error) {
    if (!(error instanceof DifficultyError)) throw error
    console.warn(`${error.message}; using "${config.difficulty}"`)
    return resolveDifficulty(config)
  }
}
