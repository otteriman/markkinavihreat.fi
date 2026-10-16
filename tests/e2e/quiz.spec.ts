import { expect, test, type Page } from '@playwright/test'

// Flow tests run with reduced motion: cards wait for Continue and the result
// reveal is instant. Motion itself is covered at the end of this file.
test.use({ contextOptions: { reducedMotion: 'reduce' } })

const START: Record<string, string> = { fi: '/testi/', sv: '/sv/testi/', en: '/en/testi/' }
const PREFIX: Record<string, string> = { fi: '', sv: '/sv', en: '/en' }

const visibleStep = (page: Page) => page.locator('[data-step]:not([hidden])')

/** Plays the bonus level (after q3) the winning way and waits until it has closed. */
async function passBonus(page: Page) {
  const overlay = page.locator('#bonus')
  await expect(overlay).toBeVisible()
  await overlay.locator('[data-bonus="yes"]').click()
  await expect(overlay).toBeHidden({ timeout: 10000 })
}

/** Answers every screen with the strongest agreement and the "price" finale. */
async function completeQuiz(page: Page) {
  await page.locator('[data-action="start"]').click()
  for (let guard = 0; guard < 40; guard++) {
    if (await page.locator('#bonus').isVisible()) {
      await passBonus(page)
      continue
    }
    const step = visibleStep(page)
    const key = await step.getAttribute('data-step')
    if (key!.startsWith('a:')) await step.locator('[data-action="continue"]').click()
    else if (await step.locator('[data-option]').count()) {
      await step.locator('[data-option="price"]').click()
      await page.waitForURL(/\/tulos\//)
      return
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
    await step.locator('[data-answer="0"]').click()
    await page.locator(`[data-step="a:${id}"] [data-action="continue"]`).click()
    if (id === 'q3') await passBonus(page)
  }
  await page.locator('[data-guess-slider]').fill('2000')
  await page.locator('[data-step="q:guess"] [data-action="next"]').click()
  await expect(page.locator('[data-guess-result]')).toContainText('7')
})

test('tapping an after-question card moves on', async ({ page }) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
  // A tap in the first moments after the card appears is ignored as a stray one.
  await page.waitForTimeout(500)
  await page.locator('[data-step="a:q1"] [data-cue]').click()
  await expect(page.locator('[data-step="q:q2"]')).toBeVisible()
})

test('the tree grows one stage per answered question, not on the guess', async ({ page }) => {
  await page.goto(START.fi)
  const shapes = () => page.locator('#quiz-tree svg > *').count()
  await page.locator('[data-action="start"]').click()
  const seedling = await shapes()
  for (const id of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    const step = page.locator(`[data-step="q:${id}"]`)
    await step.locator('[data-answer="1"]').click()
    await page.locator(`[data-step="a:${id}"] [data-action="continue"]`).click()
    if (id === 'q3') await passBonus(page)
  }
  const afterFive = await shapes()
  expect(afterFive).toBeGreaterThan(seedling)
  await page.locator('[data-step="q:guess"] [data-action="next"]').click()
  await page.locator('[data-step="a:guess"] [data-action="continue"]').click()
  expect(await shapes()).toBe(afterFive)
})

test("the result page shows the visitor's own tree", async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/?m=82&y=79&v=85')
  await expect(page.locator('#result-tree svg')).toHaveAttribute('aria-label', /Pigou/)
})

test.describe('with motion', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('after-question cards wait for a tap, also with motion', async ({ page }) => {
    await page.goto(START.fi)
    await page.locator('[data-action="start"]').click()
    await page.locator('[data-step="q:q1"] [data-answer="0"]').click()
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-step="a:q1"]')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-step="q:q2"]')).toBeVisible()
  })

  test('the result reveal plays, then goes to the result page', async ({ page }) => {
    await page.goto(START.fi)
    await page.locator('[data-action="start"]').click()
    for (let guard = 0; guard < 40; guard++) {
      if (await page.locator('#bonus').isVisible()) {
        await passBonus(page)
        continue
      }
      const step = page.locator('[data-step]:not([hidden])')
      const key = await step.getAttribute('data-step')
      if (key === 'reveal') break
      if (key!.startsWith('a:')) {
        const next = step.locator('[data-action="continue"]')
        // The card may already have moved on by itself.
        await next.click({ timeout: 1000 }).catch(() => {})
      } else if (await step.locator('[data-option]').count())
        await step.locator('[data-option="price"]').click()
      else if (await step.locator('[data-guess-slider]').count())
        await step.locator('[data-action="next"]').click()
      else await step.locator('[data-answer="2"]').click()
    }
    const reveal = page.locator('[data-step="reveal"]')
    await expect(reveal).toBeVisible()
    // The percentage counts up from 0 and the type name appears before moving on.
    await expect(reveal.locator('[data-reveal-percent]')).not.toContainText(/^0 /, {
      timeout: 6000,
    })
    await expect(reveal.locator('[data-reveal-type]')).toHaveClass(/opacity-100/, { timeout: 6000 })
    await page.waitForURL(/\/testi\/tulos\/[a-z]+-\d+\/\?m=/, { timeout: 10000 })
    const percent = await page.locator('[data-result-percent]').textContent()
    expect(percent).toMatch(/\d+ %/)
  })
})

test.describe('on an iPhone 11 Pro sized screen', () => {
  // Safari's visible area on an iPhone 11 Pro.
  test.use({ viewport: { width: 375, height: 635 } })

  test('every question and its answers fit without scrolling', async ({ page }) => {
    await page.goto(START.fi)
    await page.locator('[data-action="start"]').click()
    for (const id of ['q1', 'q2', 'q3', 'q4', 'q5', 'guess', 'q6', 'q7', 'q8', 'q9']) {
      const step = page.locator(`[data-step="q:${id}"]`)
      await expect(step).toBeVisible()
      await expect(page.locator('#quiz-tree-wrap')).toBeHidden()
      if (id === 'guess') {
        await step.locator('[data-action="next"]').click()
        await page.locator('[data-step="a:guess"] [data-action="continue"]').click()
        continue
      }
      // The bottom row of controls (Back, Skip) is on screen without scrolling.
      const last = (await step.locator('[data-action="back"]').boundingBox())!
      expect(last.y).toBeGreaterThanOrEqual(0)
      expect(last.y + last.height).toBeLessThanOrEqual(635)
      await step.locator('[data-answer="1"]').click()
      await page.locator(`[data-step="a:${id}"] [data-action="continue"]`).click()
      if (id === 'q3') await passBonus(page)
    }
  })
})

test('after an answer the tree appears with a sentence on what the answer indicated', async ({
  page,
}) => {
  await page.goto(START.fi)
  await page.locator('[data-action="start"]').click()
  await expect(page.locator('#quiz-tree-wrap')).toBeHidden()
  // q1 (markets, agreeing raises it): strongly agree.
  await page.locator('[data-step="q:q1"] [data-answer="2"]').click()
  await expect(page.locator('#quiz-tree-wrap')).toBeVisible()
  await expect(page.locator('[data-step="a:q1"] [data-cue]')).toHaveText(
    'Vastauksesi perusteella luotat markkinoihin.',
  )
  await page.locator('[data-step="a:q1"] [data-action="continue"]').click()
  // q2 (environment): skipped.
  await page.locator('[data-step="q:q2"] [data-action="skip"]').click()
  await expect(page.locator('[data-step="a:q2"] [data-cue]')).toHaveText('Ohitit tämän kysymyksen.')
  await page.locator('[data-step="a:q2"] [data-action="continue"]').click()
  // q3 (freedom): "can't say".
  await page.locator('[data-step="q:q3"] [data-answer="0"]').click()
  await expect(page.locator('[data-step="a:q3"] [data-cue]')).toHaveText(
    'Vastauksesi perusteella et kallistu kumpaankaan suuntaan.',
  )
  await page.locator('[data-step="a:q3"] [data-action="continue"]').click()
  await passBonus(page)
  // q4 (markets, reversed): agreeing lowers markets.
  await page.locator('[data-step="q:q4"] [data-answer="2"]').click()
  await expect(page.locator('[data-step="a:q4"] [data-cue]')).toHaveText(
    'Vastauksesi perusteella luotat julkiseen ohjaukseen.',
  )
})

test.describe('bonus level', () => {
  /** Answers q1–q3 so that the bonus level starts. */
  async function reachBonus(page: Page) {
    await page.goto(START.fi)
    await page.locator('[data-action="start"]').click()
    for (const id of ['q1', 'q2', 'q3']) {
      await expect(page.locator('#bonus')).toBeHidden()
      await page.locator(`[data-step="q:${id}"] [data-answer="1"]`).click()
      await page.locator(`[data-step="a:${id}"] [data-action="continue"]`).click()
    }
    const overlay = page.locator('#bonus')
    await expect(overlay).toBeVisible()
    return overlay
  }

  test('comes after q3: put the sweater on, win and return to q4', async ({ page }) => {
    const overlay = await reachBonus(page)
    await expect(overlay.locator('[data-bonus-screen="title"]')).toContainText('Yllätyshaaste!')
    await expect(overlay.locator('[data-bonus-screen="title"]')).toContainText(
      'Vihreiden villapaitapeli!',
    )
    await expect(overlay.locator('[data-bonus-screen="game"]')).toContainText(
      'Pue Laurille villapaita',
    )
    await overlay.locator('[data-bonus="yes"]').click()
    // "O!" while the sweater comes, then the giggle.
    await expect(overlay.locator('.bonus-figure .bonus-person')).toHaveAttribute(
      'data-mood',
      'surprised',
    )
    await expect(overlay.locator('.bonus-figure .bonus-person')).toHaveClass(/is-dressed/)
    await expect(overlay.locator('.bonus-figure .bonus-person')).toHaveAttribute(
      'data-mood',
      'laugh',
    )
    await expect(overlay.locator('[data-bonus-tickles]')).toHaveText('Hihihi, kutittaa!')
    await expect(overlay.locator('[data-bonus-screen="win"]')).toContainText('Voitit pelin!')
    await expect(overlay.locator('[data-bonus-screen="win"]')).toContainText(
      'Palaat takaisin testiin',
    )
    await expect(overlay).toBeHidden({ timeout: 10000 })
    await expect(page.locator('[data-step="q:q4"]')).toBeVisible()
  })

  test('saying no shows an annoyed close-up, then the lost screen with try again or leave', async ({
    page,
  }) => {
    const overlay = await reachBonus(page)
    await overlay.locator('[data-bonus="no"]').click()
    const closeup = overlay.locator('[data-bonus-screen="closeup"]')
    await expect(closeup).toBeVisible()
    await expect(closeup).toContainText('Hmpmh')
    await expect(closeup.locator('.bonus-person')).toHaveAttribute('data-mood', 'annoyed')
    const lost = overlay.locator('[data-bonus-screen="lost"]')
    await expect(lost).toContainText('Hävisit pelin', { timeout: 4000 })
    await expect(lost.locator('[data-bonus="again"]')).toBeFocused()
    // Try again with the keyboard: back to the game, Lauri neutral again.
    await page.keyboard.press('Enter')
    await expect(overlay.locator('[data-bonus-screen="game"]')).toBeVisible()
    await expect(overlay.locator('.bonus-figure .bonus-person')).toHaveAttribute(
      'data-mood',
      'neutral',
    )
    // No again, then leave: straight back to q4, no win screen.
    await overlay.locator('[data-bonus="no"]').click()
    await lost.locator('[data-bonus="leave"]').click({ timeout: 4000 })
    await expect(overlay).toBeHidden()
    await expect(overlay.locator('[data-bonus-screen="win"]')).toBeHidden()
    await expect(page.locator('[data-step="q:q4"]')).toBeVisible()
  })

  test('Back from q4 goes to q3, not to the bonus level', async ({ page }) => {
    const overlay = await reachBonus(page)
    await overlay.locator('[data-bonus="yes"]').click()
    await expect(overlay).toBeHidden({ timeout: 10000 })
    await page.locator('[data-step="q:q4"] [data-action="back"]').click()
    await expect(page.locator('[data-step="q:q3"]')).toBeVisible()
    await expect(overlay).toBeHidden()
  })

  test.describe('on an iPhone 11 Pro sized screen', () => {
    test.use({ viewport: { width: 375, height: 635 } })

    test('the game fits without scrolling', async ({ page }) => {
      const overlay = await reachBonus(page)
      const yes = overlay.locator('[data-bonus="yes"]')
      await expect(yes).toBeVisible()
      const box = (await yes.boundingBox())!
      expect(box.y + box.height).toBeLessThanOrEqual(635)
      const figure = (await overlay.locator('.bonus-figure .bonus-person').boundingBox())!
      expect(figure.y + figure.height).toBeLessThanOrEqual(635)
    })
  })
})
