import { expect, test, type Page } from '@playwright/test'

// The debate game, against the production build: the page is noindex until
// launch, /debate-lab/ isn't built and ?difficulty= is ignored.

const pages = [
  { path: '/debaattipeli/', lang: 'fi', title: 'Vihreä väittely', start: 'Aloita väittely' },
  { path: '/sv/debaattipeli/', lang: 'sv', title: 'Grön debatt', start: 'Starta debatten' },
  { path: '/en/debaattipeli/', lang: 'en', title: 'Green debate', start: 'Start the debate' },
]

/** Option grids ignore picks for their first 300 ms, the end screen for 800 ms. */
const GRID_GRACE = 350
const END_GRACE = 850

const stage = (page: Page) => page.locator('.debate-stage')
const grid = (page: Page) => page.locator('[data-debate-options]')
const endScreen = (page: Page) => page.locator('[data-debate-end]')

for (const { path, lang, title, start } of pages) {
  test(`debate page shows the stage and a start button (${lang})`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await expect(page.getByRole('group', { name: title })).toBeVisible()
    await expect(page.getByRole('button', { name: start })).toBeVisible()
    await expect(stage(page).locator('svg')).toHaveCount(2)
  })
}

test('a whole battle by keyboard, with Play again', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/debaattipeli/')
  await page.getByRole('button', { name: 'Aloita väittely' }).focus()
  await page.keyboard.press('Enter')

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
      await page.keyboard.press('Enter')
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
  await page.getByRole('button', { name: 'Start the debate' }).tap()

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

test('production ignores ?difficulty=', async ({ page }) => {
  await page.goto('/debaattipeli/?difficulty=easy')
  expect(
    await page.locator('[data-debate]').getAttribute('data-debate-difficulty-param'),
  ).toBeNull()
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
