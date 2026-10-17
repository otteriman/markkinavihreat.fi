import { readdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// The debate game, against the production build: the page is noindex until
// launch, /debate-lab/ isn't built and ?difficulty= is ignored.

const pages = [
  {
    path: '/debaattipeli/',
    lang: 'fi',
    title: 'Poliittinen väittelypeli',
    card: 'Poliittinen debaattipeli',
    intro: 'Villi kansalliskonservatiivi ilmestyi!',
  },
  {
    path: '/sv/debaattipeli/',
    lang: 'sv',
    title: 'Politiskt debattspel',
    card: 'Politiskt debattspel',
    intro: 'En vild nationalkonservativ dök upp!',
  },
  {
    path: '/en/debaattipeli/',
    lang: 'en',
    title: 'Political debate game',
    card: 'Political debate game',
    intro: 'A wild national conservative appeared!',
  },
]

/** Option grids ignore picks for their first 300 ms, the end screen for 800 ms. */
const GRID_GRACE = 350
const END_GRACE = 850

const stage = (page: Page) => page.locator('.debate-stage')
const grid = (page: Page) => page.locator('[data-debate-options]')
const endScreen = (page: Page) => page.locator('[data-debate-end]')
const introScreen = (page: Page) => page.locator('[data-debate-intro]')

/** Presses "Pelaa" on the intro screen and waits for its transition to finish. */
async function startGame(page: Page) {
  await page.locator('[data-debate-start]').click()
  await expect(introScreen(page)).toBeHidden({ timeout: 10_000 })
}

for (const { path, lang, title, card, intro } of pages) {
  test(`debate page starts the battle from the intro screen (${lang})`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await expect(page.getByRole('group', { name: title })).toBeVisible()
    // The intro screen waits; after "Pelaa" it wipes away and the battle begins.
    await expect(introScreen(page)).toContainText(card)
    await page.waitForTimeout(500)
    await expect(page.locator('[data-debate-bottom]')).toHaveText('')
    await startGame(page)
    await expect(page.locator('[data-debate-bottom]')).toHaveText(intro)
    await expect(stage(page)).toBeFocused()
    await expect(stage(page).locator('.debate-sprite svg')).toHaveCount(2)
  })
}

test('a whole battle by keyboard, with Play again', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/debaattipeli/')
  await startGame(page)
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')

  let attackGrids = 0
  let firstAttack = ''
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline && !(await endScreen(page).isVisible())) {
    if (await grid(page).isVisible()) {
      await page.waitForTimeout(GRID_GRACE)
      const options = grid(page).getByRole('button')
      const attacking =
        (await page.locator('[data-debate-tag="bottom"]').textContent()) ===
        'Millä teemalla hyökkäät?'
      if (attacking) {
        attackGrids++
        // Enter picks the first option; a used attack isn't offered again.
        if (attackGrids === 1) firstAttack = (await options.first().textContent()) ?? ''
        if (attackGrids === 2) await expect(grid(page)).not.toContainText(firstAttack)
        expect(await options.count()).toBeLessThanOrEqual(6)
      }
      await page.keyboard.press('Enter')
      if (attacking && attackGrids === 1) {
        // Attacking empties the enemy's box, label and all, until he answers.
        await expect(page.locator('[data-debate-tag="bottom"]')).toHaveText(/^Hyökkäys: /)
        await expect(page.locator('[data-debate-box="top"]')).toBeHidden()
        await expect(page.locator('[data-debate-tag="top"]')).toBeHidden()
        await page.keyboard.press('Enter')
        await expect(page.locator('[data-debate-tag="top"]')).toHaveText('Puolustus')
      }
    } else {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(20)
    }
  }

  await expect(endScreen(page)).toBeVisible()
  await expect(endScreen(page)).toContainText(/Täydelliset vastaukset: \d\/\d/)
  await expect(page.getByRole('button', { name: 'Pelaa uudelleen' })).toBeFocused()
  await page.waitForTimeout(END_GRACE)
  await page.keyboard.press('Enter')
  await expect(endScreen(page)).toBeHidden()
  await expect(page.locator('[data-debate-kannatus="player"]')).toHaveText('100')
  await expect(page.locator('[data-debate-kannatus="enemy"]')).toHaveText('100')

  // Nothing about the game is stored.
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
  expect(await page.context().cookies()).toEqual([])
})

test('a whole battle by tapping on a phone, with typing and bars', async ({ browser }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('/en/debaattipeli/')
  await page.locator('[data-debate-start]').tap()
  // On a phone the battle fills the screen.
  await expect(page.locator('[data-debate]')).toHaveClass(/debate-fullscreen/)
  await expect(introScreen(page)).toBeHidden({ timeout: 10_000 })

  // The first line types out; a tap shows it all at once.
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  await stage(page).tap({ position: { x: 60, y: 60 } })
  await expect(page.locator('[data-debate-bottom]')).toHaveText(
    'A wild national conservative appeared!',
  )
  await expect(page.locator('[data-debate-more="bottom"]')).toBeVisible()

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline && !(await endScreen(page).isVisible())) {
    if (await grid(page).isVisible()) {
      await page.waitForTimeout(GRID_GRACE)
      await grid(page).getByRole('button').first().tap()
    } else {
      await stage(page).tap({ position: { x: 60, y: 60 } })
    }
  }
  await expect(endScreen(page)).toContainText(/Perfect replies: \d\/\d/)
  // The end screen leaves full screen, and the history entry it added.
  await expect(page.locator('[data-debate]')).not.toHaveClass(/debate-fullscreen/)
  expect(new URL(page.url()).pathname).toBe('/en/debaattipeli/')
  // Someone lost support along the way.
  const scores = await page.locator('[data-debate-kannatus]').allInnerTexts()
  expect(scores.some((s) => Number(s) < 100)).toBe(true)
  await context.close()
})

test('on a phone, back leaves full screen and stays on the game', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('/debaattipeli/')
  const frame = page.locator('[data-debate]')
  await page.locator('[data-debate-start]').tap()
  await expect(frame).toHaveClass(/debate-fullscreen/)
  await expect(introScreen(page)).toBeHidden({ timeout: 10_000 })
  await page.goBack()
  await expect(frame).not.toHaveClass(/debate-fullscreen/)
  expect(new URL(page.url()).pathname).toBe('/debaattipeli/')
  // The battle carries on in the page.
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  await context.close()
})

test('a desktop battle doesn’t go full screen', async ({ page }) => {
  await page.goto('/debaattipeli/')
  await startGame(page)
  await expect(page.locator('[data-debate]')).not.toHaveClass(/debate-fullscreen/)
})

test('both characters slide in when the battle starts', async ({ page }) => {
  await page.goto('/debaattipeli/')
  await startGame(page)
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  await expect(page.locator('.debate-sprite-enemy')).toBeVisible()
  await expect(page.locator('.debate-sprite-player')).toBeVisible()
  await expect(page.locator('.debate-enter')).toHaveCount(0)
})

test('with reduced motion the characters are simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/debaattipeli/')
  await startGame(page)
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  await expect(page.locator('.debate-sprite-enemy')).toBeVisible()
  await expect(page.locator('.debate-enter')).toHaveCount(0)
})

test('sound is off until the toggle is clicked', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { audioContexts: number; AudioContext: typeof AudioContext }
    w.audioContexts = 0
    const Base = window.AudioContext
    w.AudioContext = class extends Base {
      constructor(options?: AudioContextOptions) {
        super(options)
        w.audioContexts++
      }
    }
  })
  await page.goto('/debaattipeli/')
  await startGame(page)
  const toggle = page.getByRole('button', { name: 'Äänet päälle' })
  await expect(toggle).toBeVisible()
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  const contexts = () =>
    page.evaluate(() => (window as unknown as { audioContexts: number }).audioContexts)
  expect(await contexts()).toBe(0)
  await toggle.click()
  await expect(page.getByRole('button', { name: 'Äänet pois' })).toBeVisible()
  expect(await contexts()).toBe(1)
  // A mouse click hands focus back to the game, so Enter keeps advancing it.
  await expect(page.locator('.debate-stage')).toBeFocused()
  await page.getByRole('button', { name: 'Äänet pois' }).click()
  await expect(page.getByRole('button', { name: 'Äänet päälle' })).toBeVisible()
})

test('"Pelaa" flashes the screen, then a clock wipe uncovers the stage', async ({ page }) => {
  await page.goto('/debaattipeli/')
  await page.locator('[data-debate-start]').click()
  await expect(introScreen(page)).toHaveClass(/debate-intro-flashing/)
  await expect(introScreen(page)).toHaveClass(/debate-intro-wiping/, { timeout: 3_000 })
  await expect(introScreen(page)).toBeHidden({ timeout: 5_000 })
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
})

test('production ignores ?difficulty= and ?special=', async ({ page }) => {
  await page.goto('/debaattipeli/?difficulty=easy&special=paakirjoitustoimittaja')
  expect(await page.locator('[data-debate]').getAttribute('data-debate-preview-params')).toBeNull()
  await expect(page.locator('[data-debate-note]')).toBeHidden()
})

test('debate page loads its font from the site itself', async ({ page }) => {
  const fonts: string[] = []
  page.on('request', (r) => {
    if (r.resourceType() === 'font' && r.url().includes('Jersey')) fonts.push(r.url())
  })
  await page.goto('/debaattipeli/')
  await page.evaluate(() => document.fonts.ready)
  expect(fonts).toHaveLength(1)
  expect(new URL(fonts[0]).origin).toBe(new URL(page.url()).origin)
})

/** What a weak reply plus the smallest critical extra costs the player, from config.json. */
function weakHit() {
  const config = JSON.parse(readFileSync('src/data/debate/config.json', 'utf-8'))
  const normal = config.difficulties[config.difficulty]
  const player = normal.player
  return Math.round(player.baseDamage * player.damage.weak) + normal.critical.extraMin
}

/**
 * The first weak reply that calls the editorial writer in, with the texts the
 * test expects, read from the content so copy edits don't break the test.
 */
function editorScene() {
  const dir = 'src/data/debate/enemies/kansalliskonservatiivi/enemy-attacks'
  const json = (path: string) => JSON.parse(readFileSync(path, 'utf-8'))
  for (const file of readdirSync(dir).sort()) {
    const attack = json(`${dir}/${file}`)
    for (const reply of attack.replies) {
      const triggers = [reply.critical ?? []].flat()
      // Math.random → 0 picks the first trigger.
      if (reply.quality === 'weak' && triggers[0]?.by === 'paakirjoitustoimittaja') {
        const ui = json('src/data/debate/ui.json')
        const editor = json('src/data/debate/specials/paakirjoitustoimittaja.json')
        return {
          attack: attack.name.fi as string,
          reply: reply.label.fi as string,
          reaction: reply.reaction.fi as string,
          line: triggers[0].say.fi as string,
          name: editor.name.fi as string,
          appear: editor.appear.fi as string,
          effect: ui['effect.defend.weak'].fi as string,
          critical: ui['effect.critical'].fi as string,
          // A weak reply's full hit plus the smallest extra (Math.random → 0).
          damage: weakHit(),
        }
      }
    }
  }
  throw new Error('No weak reply calls the editorial writer in')
}

test('a critical hit: the editorial writer steps in, the hit lands harder', async ({ page }) => {
  const scene = editorScene()
  // Math.random → 0: every roll succeeds, so his reply always calls him in,
  // with the smallest extra damage (5).
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await page.goto('/debaattipeli/')
  await startGame(page)
  const cutin = page.locator('[data-debate-cutin]')
  const deadline = Date.now() + 60_000
  while (!(await cutin.isVisible())) {
    expect(Date.now(), 'the editorial writer never stepped in').toBeLessThan(deadline)
    if (await grid(page).isVisible()) {
      await page.waitForTimeout(GRID_GRACE)
      const his = grid(page).getByRole('button', { name: scene.reply, exact: true })
      if (await his.count()) await his.click()
      else await grid(page).getByRole('button').first().click()
    } else {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(20)
    }
  }
  const before = Number(await page.locator('[data-debate-kannatus="player"]').textContent())
  await expect(page.locator('[data-debate-bottom]')).toHaveText(scene.appear)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-debate-tag="top"]')).toHaveText(scene.name)
  await expect(page.locator('[data-debate-top]')).toHaveText(scene.line)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(cutin).toBeHidden()
  // His box and both labels are back as they were before the cut-in.
  await expect(page.locator('[data-debate-top]')).toHaveText(scene.reaction)
  await expect(page.locator('[data-debate-tag="top"]')).toHaveText(`Hyökkäys: ${scene.attack}`)
  await expect(page.locator('[data-debate-tag="bottom"]')).toHaveText(`Vastaus: ${scene.reply}`)
  await expect(page.locator('[data-debate-bottom]')).toHaveText(scene.effect)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-debate-bottom]')).toHaveText(scene.critical)
  // KANNATUS stops at 0 if the hit knocks the player out.
  await expect(page.locator('[data-debate-kannatus="player"]')).toHaveText(
    String(Math.max(0, before - scene.damage)),
  )
})

test('the stage scales to fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/debaattipeli/')
  const box = await stage(page).boundingBox()
  expect(box!.width).toBeGreaterThan(300)
  expect(box!.width).toBeLessThanOrEqual(390)
})

test('language switcher moves between the game’s pages', async ({ page }) => {
  await page.goto('/debaattipeli/')
  await page.getByRole('link', { name: 'SV', exact: true }).click()
  await expect(page).toHaveURL(/\/sv\/debaattipeli\/$/)
})

test('the debate lab is not built for production', async ({ page }) => {
  const response = await page.goto('/debate-lab/')
  expect(response?.status()).toBe(404)
})
