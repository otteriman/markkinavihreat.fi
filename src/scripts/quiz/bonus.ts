/**
 * Runs the bonus level (BonusGame.astro): white-out, title, the sweater game,
 * and the win screen with its 3-2-1 countdown; or, after "No", a close-up of a
 * slightly annoyed Lauri ("Hmpmh") and the lost screen with "Try again" /
 * "Leave". Resolves when the overlay has closed again.
 * Nothing here is scored, stored or sent anywhere.
 */
export type BonusOutcome = 'won' | 'left'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * `onReturn` runs while the screen is still fully white, just before it fades
 * out, so the quiz can move on underneath and the fade reveals the next question.
 */
export async function playBonus(
  overlay: HTMLElement,
  reduce: boolean,
  onReturn: () => void = () => {},
): Promise<BonusOutcome> {
  const config = JSON.parse(overlay.querySelector('[data-bonus-config]')?.textContent ?? '{}') as {
    tickles: string
  }
  const status = overlay.querySelector<HTMLElement>('[data-bonus-status]')!
  const person = overlay.querySelector<SVGSVGElement>('.bonus-figure .bonus-person')!
  const tickles = overlay.querySelector<HTMLElement>('[data-bonus-tickles]')!
  const choices = (which: 'ask' | 'retry') =>
    overlay.querySelector<HTMLElement>(`[data-bonus-choices="${which}"]`)!
  const count = overlay.querySelector<HTMLElement>('[data-bonus-count]')!
  const pause = (ms: number) => wait(reduce ? Math.min(ms, 1000) : ms)

  const screen = (name: 'title' | 'game' | 'closeup' | 'lost' | 'win') => {
    overlay.querySelectorAll<HTMLElement>('[data-bonus-screen]').forEach((el) => {
      el.hidden = el.dataset.bonusScreen !== name
    })
    overlay
      .querySelector<HTMLElement>(`[data-bonus-screen="${name}"] [data-bonus-focus]`)
      ?.focus({ preventScroll: true })
  }

  /** Waits for one of the given buttons and returns its data-bonus value. */
  const choose = (within: HTMLElement) =>
    new Promise<string>((resolve) => {
      const onClick = (event: Event) => {
        const button = (event.target as Element).closest<HTMLElement>('[data-bonus]')
        if (!button) return
        within.removeEventListener('click', onClick)
        resolve(button.dataset.bonus!)
      }
      within.addEventListener('click', onClick)
    })

  const resetGame = () => {
    person.dataset.mood = 'neutral'
    person.classList.remove('is-dressed', 'is-tickled')
    tickles.hidden = true
    choices('ask').hidden = false
    status.textContent = ''
  }

  const close = async () => {
    onReturn()
    overlay.classList.remove('is-open')
    await wait(reduce ? 0 : 600)
    overlay.hidden = true
  }

  // White-out, then the title.
  resetGame()
  overlay.hidden = false
  void overlay.offsetWidth // let the fade start from transparent
  overlay.classList.add('is-open')
  screen('title')
  await pause(reduce ? 1500 : 2600)

  for (;;) {
    screen('game')
    const answer = await choose(choices('ask'))
    if (answer === 'yes') {
      choices('ask').hidden = true
      // The sweater slides in from the left; once it is on, Lauri giggles.
      person.classList.add('is-dressed')
      await wait(reduce ? 0 : 950)
      person.dataset.mood = 'laugh'
      person.classList.add('is-tickled')
      tickles.hidden = false
      status.textContent = config.tickles
      await pause(2400)
      break
    }
    // "No": a close-up of a slightly annoyed Lauri ("Hmpmh"), then the lost
    // screen with the choice to try again or leave.
    screen('closeup')
    await pause(2200)
    screen('lost')
    choices('retry').querySelector<HTMLElement>('button')?.focus()
    if ((await choose(choices('retry'))) === 'leave') {
      await close()
      return 'left'
    }
    resetGame()
  }

  // Won: count down back to the quiz.
  screen('win')
  for (const n of [3, 2, 1]) {
    count.textContent = String(n)
    count.classList.remove('is-ticking')
    void count.offsetWidth
    count.classList.add('is-ticking')
    await wait(1000)
  }
  await close()
  return 'won'
}
