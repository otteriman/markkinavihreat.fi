import { expect, test, type Page } from '@playwright/test'

// The debate game, against the production build: the page is noindex until
// launch, /debate-lab/ isn't built and ?difficulty= is ignored.

const pages = [
  {
    path: '/debaattipeli/',
    lang: 'fi',
    title: 'Vihreä väittely',
    intro: 'Villi kansalliskonservatiivi ilmestyi!',
  },
  {
    path: '/sv/debaattipeli/',
    lang: 'sv',
    title: 'Grön debatt',
    intro: 'En vild nationalkonservativ dök upp!',
  },
  {
    path: '/en/debaattipeli/',
    lang: 'en',
    title: 'Green debate',
    intro: 'A wild national conservative appeared!',
  },
]

/** Option grids ignore picks for their first 300 ms, the end screen for 800 ms. */
const GRID_GRACE = 350
const END_GRACE = 850

const stage = (page: Page) => page.locator('.debate-stage')
const grid = (page: Page) => page.locator('[data-debate-options]')
const endScreen = (page: Page) => page.locator('[data-debate-end]')

for (const { path, lang, title, intro } of pages) {
  test(`debate page starts the battle by itself (${lang})`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await expect(page.getByRole('group', { name: title })).toBeVisible()
    // No start button: the opening line types out by itself, with focus in the game.
    await expect(page.locator('[data-debate-bottom]')).toHaveText(intro)
    await expect(stage(page)).toBeFocused()
    await expect(stage(page).locator('.debate-sprite svg')).toHaveCount(2)
  })
}

test('a whole battle by keyboard, with Play again', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/debaattipeli/')
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')

  let attackGrids = 0
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline && !(await endScreen(page).isVisible())) {
    if (await grid(page).isVisible()) {
      await page.waitForTimeout(GRID_GRACE)
      const options = grid(page).getByRole('button')
      if ((await options.count()) === 6) {
        attackGrids++
        if (attackGrids === 2) {
          // The first attack was used in round 1: it stays in the grid but can't be picked.
          await page.keyboard.press('ArrowLeft')
          await expect(options.first()).toBeFocused()
          await expect(options.first()).toHaveAttribute('aria-disabled', 'true')
          await page.keyboard.press('Enter')
          await expect(grid(page)).toBeVisible()
          await expect(page.locator('[data-debate-live]')).toContainText('käytetty')
          await page.keyboard.press('ArrowRight')
        }
      }
      const attacking = (await options.count()) === 6
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
      await grid(page).locator('button:not([aria-disabled])').first().tap()
    } else {
      await stage(page).tap({ position: { x: 60, y: 60 } })
    }
  }
  await expect(endScreen(page)).toContainText(/Perfect replies: \d\/\d/)
  // Someone lost support along the way.
  const scores = await page.locator('[data-debate-kannatus]').allInnerTexts()
  expect(scores.some((s) => Number(s) < 100)).toBe(true)
  await context.close()
})

test('both characters slide in when the battle starts', async ({ page }) => {
  await page.goto('/debaattipeli/')
  await expect(page.locator('[data-debate-bottom]')).not.toHaveText('')
  await expect(page.locator('.debate-sprite-enemy')).toBeVisible()
  await expect(page.locator('.debate-sprite-player')).toBeVisible()
  await expect(page.locator('.debate-enter')).toHaveCount(0)
})

test('with reduced motion the characters are simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/debaattipeli/')
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

test('the battle waits until the stage is on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 300 })
  await page.goto('/debaattipeli/')
  await page.waitForTimeout(500)
  await expect(page.locator('[data-debate-bottom]')).toHaveText('')
  await stage(page).scrollIntoViewIfNeeded()
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

test('a critical hit: the editorial writer steps in, the hit lands harder', async ({ page }) => {
  // Math.random → 0: every roll succeeds, so "Veronkorotus" always calls him in,
  // with the smallest extra damage (5).
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await page.goto('/debaattipeli/')
  const cutin = page.locator('[data-debate-cutin]')
  const deadline = Date.now() + 60_000
  while (!(await cutin.isVisible())) {
    expect(Date.now(), 'the editorial writer never stepped in').toBeLessThan(deadline)
    if (await grid(page).isVisible()) {
      await page.waitForTimeout(GRID_GRACE)
      const tax = grid(page).getByRole('button', { name: 'Veronkorotus' })
      if (await tax.count()) await tax.click()
      else await grid(page).locator('button:not([aria-disabled])').first().click()
    } else {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(20)
    }
  }
  const before = Number(await page.locator('[data-debate-kannatus="player"]').textContent())
  await expect(page.locator('[data-debate-bottom]')).toHaveText(
    'Pääkirjoitustoimittaja astuu esiin!',
  )
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-debate-tag="top"]')).toHaveText('Pääkirjoitustoimittaja')
  await expect(page.locator('[data-debate-top]')).toContainText('Veronkorotukset tappaisivat')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(cutin).toBeHidden()
  // His box and both labels are back as they were before the cut-in.
  await expect(page.locator('[data-debate-top]')).toHaveText(
    'Verohelvetti! Kiitos, että sanoit sen ääneen.',
  )
  await expect(page.locator('[data-debate-tag="top"]')).toHaveText('Hyökkäys: Velkapaniikki')
  await expect(page.locator('[data-debate-tag="bottom"]')).toHaveText('Vastaus: Veronkorotus')
  await expect(page.locator('[data-debate-bottom]')).toHaveText(
    'Puolustuksesi ei tehonnut lainkaan!',
  )
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-debate-bottom]')).toHaveText('Kriittinen osuma!')
  // A weak reply's full hit (30) plus the extra 5.
  await expect(page.locator('[data-debate-kannatus="player"]')).toHaveText(String(before - 35))
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
