import { expect, test, type Page } from '@playwright/test'

const START: Record<string, string> = { fi: '/testi/', sv: '/sv/testi/', en: '/en/testi/' }
const PREFIX: Record<string, string> = { fi: '', sv: '/sv', en: '/en' }

const visibleStep = (page: Page) => page.locator('[data-step]:not([hidden])')

/** Answers every screen with the strongest agreement and the "price" finale. */
async function completeQuiz(page: Page) {
  await page.locator('[data-action="start"]').click()
  for (let guard = 0; guard < 40; guard++) {
    const step = visibleStep(page)
    const key = await step.getAttribute('data-step')
    if (key!.startsWith('a:')) await step.locator('[data-action="continue"]').click()
    else if (await step.locator('[data-option]').count()) {
      await step.locator('[data-option="price"]').click()
      await page.waitForURL(/\/tulos\//)
      return
    } else if (await step.locator('[data-slider]').count()) {
      await step.locator('[data-slider]').fill('2')
      await step.locator('[data-action="next"]').click()
    } else if (await step.locator('[data-guess-slider]').count())
      await step.locator('[data-action="next"]').click()
    else await step.locator('[data-answer="2"]').click()
  }
  throw new Error('Quiz did not finish')
}

for (const locale of ['fi', 'sv', 'en']) {
  test(`completes the quiz in ${locale} and lands on the matching result page`, async ({
    page,
  }) => {
    await page.goto(START[locale])
    await completeQuiz(page)
    // All "strongly agree" answers: reversed items pull the axes to 75 / 75 / 67.
    await expect(page).toHaveURL(
      `${PREFIX[locale]}/testi/tulos/pigou-70/?m=75&y=75&v=67#a=2,2,2,2,2,2,2,2,2`.replace(
        /^/,
        'http://localhost:4321',
      ),
    )
    await expect(page.locator('[data-result-percent]')).toContainText('72')
    await expect(
      page.locator('[data-bars="you"] [data-bar="freedom"] [data-bar-value]'),
    ).toHaveText('67')
  })
}

test('a challenge link carries the friend scores to the result page', async ({ page }) => {
  await page.goto('/testi/?cm=40&cy=50&cv=60')
  await completeQuiz(page)
  expect(page.url()).toContain('&cm=40&cy=50&cv=60')
  await expect(page.locator('[data-compare]')).toBeVisible()
})

test('is noindex and not in the sitemap while in development', async ({ page, request }) => {
  await page.goto('/testi/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  const sitemap = await request.get('/sitemap-0.xml')
  expect(await sitemap.text()).not.toContain('/testi/')
})

test('back returns to the previous question and keeps its answer', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="1"]').click()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  await expect(page.locator('[data-step="q:q2"]')).toBeVisible()
  await page.locator('[data-step="q:q2"] [data-action="back"]').click()
  await expect(page.locator('[data-step="q:q1"]')).toBeVisible()
  await expect(page.locator('[data-step="q:q1"] [data-answer="1"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('skip counts as a neutral answer', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-action="skip"]').click()
  await expect(page.locator('[data-step="a:q1"]')).toBeVisible()
})

test('swipe questions can be answered with the buttons only', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  const q2 = page.locator('[data-step="q:q2"]')
  await expect(q2.locator('[data-swipe]')).toBeVisible()
  await q2.locator('[data-answer="-1"]').click()
  await expect(page.locator('[data-step="a:q2"]')).toBeVisible()
})

test('swipe questions can be answered with the arrow keys', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  await page.locator('[data-step="q:q2"] [data-swipe]').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-step="a:q2"]')).toBeVisible()
})

test('swiping a card answers the question', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  const box = (await page.locator('[data-step="q:q2"] [data-swipe]').boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + box.width * 0.5, y, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('[data-step="a:q2"]')).toBeVisible()
})

test('a short drag snaps back without answering', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  const box = (await page.locator('[data-step="q:q2"] [data-swipe]').boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 10, y, { steps: 2 })
  await page.mouse.up()
  await expect(page.locator('[data-step="q:q2"]')).toBeVisible()
})

test('runs through with the keyboard only', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').focus()
  await page.keyboard.press('Enter')
  // q1: five stacked buttons; the first focusable control after the heading is "strongly disagree".
  await page.locator('[data-step="q:q1"] [data-answer="-2"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-step="a:q1"]')).toBeVisible()
  await page.locator('[data-step="a:q1"] [data-action="continue"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-step="q:q2"]')).toBeVisible()
})

test('does not auto-advance after-question cards (also with reduced motion)', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  await page.waitForTimeout(2500)
  await expect(page.locator('[data-step="a:q1"]')).toBeVisible()
  await context.close()
})

test('guess reveal shows how far off the guess was', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  for (const id of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    const step = page.locator(`[data-step="q:${id}"]`)
    if (await step.locator('[data-slider]').count())
      await step.locator('[data-action="skip"]').click()
    else await step.locator('[data-answer="0"]').click()
    await page.locator(`[data-step="a:${id}"] [data-action="continue"]`).click()
  }
  await page.locator('[data-guess-slider]').fill('2000')
  await page.locator('[data-step="q:guess"] [data-action="next"]').click()
  await expect(page.locator('[data-guess-result]')).toContainText('7')
})
