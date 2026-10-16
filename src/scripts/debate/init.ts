import type { Locale } from '../../lib/content'
import { config } from '../../lib/debate/data'
import { DifficultyError, resolveDifficulty } from '../../lib/debate/difficulty'
import type { Difficulty } from '../../lib/debate/types'
import { playDebate } from './play'

/**
 * The standalone game page: the start button begins a battle, and the end
 * screen's "Play again" starts the next one straight away.
 */
export function startDebateGames(root: ParentNode): void {
  for (const frame of root.querySelectorAll<HTMLElement>('[data-debate-play]')) {
    const start = frame.querySelector<HTMLButtonElement>('[data-debate-start]')
    if (!start) continue
    const difficulty = pickDifficulty(frame)
    start.addEventListener(
      'click',
      async () => {
        start.hidden = true
        frame.scrollIntoView({ block: 'center' })
        for (;;) {
          await playDebate(frame, {
            locale: frame.lang as Locale,
            enemy: frame.dataset.debateEnemy,
            difficulty,
          })
        }
      },
      { once: true },
    )
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
