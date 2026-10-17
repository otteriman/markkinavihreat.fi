/**
 * The intro screen's exit, as the player presses "Pelaa": the screen
 * pulses darker three times (slowly, two a second: well within WCAG's three
 * flashes a second), then an unseen clock hand sweeps clockwise from three
 * o'clock and uncovers the stage behind it, like the battle transitions of
 * the original Game Boy Pokémon games. With reduced motion the intro simply
 * goes. Matches the .debate-intro-flashing and .debate-intro-wiping styles.
 */
const FLASH_MS = 1500
const WIPE_MS = 1200
/** The hand moves in steps, like an old handheld's screen: 30 of 12°. */
const WIPE_STEPS = 30

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function leaveIntro(intro: HTMLElement, reduce: boolean): Promise<void> {
  if (!reduce) {
    intro.classList.add('debate-intro-flashing')
    await wait(FLASH_MS)
    intro.classList.remove('debate-intro-flashing')
    intro.classList.add('debate-intro-wiping')
    for (let step = 1; step <= WIPE_STEPS; step++) {
      intro.style.setProperty('--sweep', `${(360 * step) / WIPE_STEPS}deg`)
      await wait(WIPE_MS / WIPE_STEPS)
    }
    intro.classList.remove('debate-intro-wiping')
    intro.style.removeProperty('--sweep')
  }
  intro.hidden = true
}
