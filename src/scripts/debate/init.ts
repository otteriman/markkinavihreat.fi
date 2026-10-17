import type { Locale } from '../../lib/content'
import { config, enemies, specials } from '../../lib/debate/data'
import { DifficultyError, resolveDifficulty } from '../../lib/debate/difficulty'
import { replyTriggers } from '../../lib/debate/scenes'
import type { Difficulty } from '../../lib/debate/types'
import { Chiptune } from './audio'
import { playDebate } from './play'
import { hideSprites } from './view'

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
    const scene = pickScene(frame)
    // The characters wait off stage for their entrance.
    hideSprites(frame)
    const sounds = new Chiptune()
    setUpSoundToggle(frame, sounds)
    const run = async () => {
      for (;;) {
        await playDebate(frame, {
          locale: frame.lang as Locale,
          enemy: frame.dataset.debateEnemy,
          difficulty,
          sounds,
          scene,
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
 * The sound toggle under the stage: off by default; its label says what a
 * click does. After a mouse click focus goes back to the stage, so Enter and
 * Space carry on advancing the battle instead of toggling the sound again.
 */
function setUpSoundToggle(frame: HTMLElement, sounds: Chiptune) {
  const button = frame.querySelector<HTMLButtonElement>('[data-debate-sound]')
  if (!button) return
  button.addEventListener('click', (event) => {
    sounds.setEnabled(!sounds.enabled)
    button.textContent = sounds.enabled ? button.dataset.onLabel! : button.dataset.offLabel!
    if (event.detail > 0)
      frame.querySelector<HTMLElement>('.debate-stage')?.focus({ preventScroll: true })
  })
}

/**
 * A preview-only URL parameter: read only in development and noindex
 * previews (the frame carries data-debate-preview-params). Production pages
 * never read them.
 */
function previewParam(frame: HTMLElement, name: string): string | null {
  return frame.dataset.debatePreviewParams !== undefined
    ? new URLSearchParams(location.search).get(name)
    : null
}

/** Adds a line to the preview note under the stage. */
function previewNote(frame: HTMLElement, text: string) {
  const note = frame.querySelector<HTMLElement>('[data-debate-note]')
  if (!note) return
  note.textContent = note.textContent ? `${note.textContent} · ${text}` : text
  note.hidden = false
}

/**
 * `?special=<id>` (the debate lab's links): a scene in which that special
 * character steps in on the first reply. See playDebate's `scene`.
 */
function pickScene(frame: HTMLElement): { special: string } | undefined {
  const special = previewParam(frame, 'special')
  if (!special) return undefined
  if (!(special in specials)) {
    console.warn(`Unknown special character "${special}"; playing a normal battle`)
    return undefined
  }
  const enemy = frame.dataset.debateEnemy ?? enemies[0].id
  const trigger = replyTriggers(enemies, special).find((t) => t.enemy === enemy)
  previewNote(
    frame,
    trigger
      ? `Scene: ${special} steps in on the reply “${trigger.replyLabel.fi}” (preview only)`
      : `Scene: no reply of this enemy calls ${special} in (preview only)`,
  )
  return { special }
}

/**
 * The shipped difficulty, or in previews the one named by `?difficulty=`,
 * so testers can compare presets.
 */
function pickDifficulty(frame: HTMLElement): Difficulty {
  const name = previewParam(frame, 'difficulty')
  if (!name) return resolveDifficulty(config)
  try {
    const difficulty = resolveDifficulty(config, name)
    previewNote(frame, `Difficulty: ${name} (preview only)`)
    return difficulty
  } catch (error) {
    if (!(error instanceof DifficultyError)) throw error
    console.warn(`${error.message}; using "${config.difficulty}"`)
    return resolveDifficulty(config)
  }
}
