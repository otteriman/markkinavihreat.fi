import { expect, test } from '@playwright/test'

const PAGES = [
  { locale: 'fi', path: '/testi/tulos/pigou-80/', quiz: '/testi/' },
  { locale: 'sv', path: '/sv/testi/tulos/pigou-80/', quiz: '/sv/testi/' },
  { locale: 'en', path: '/en/testi/tulos/pigou-80/', quiz: '/en/testi/' },
]

for (const { locale, path, quiz } of PAGES) {
  test(`${locale}: result page without scores shows the type and a call to take the quiz`, async ({
    page,
  }) => {
    await page.goto(path)
    await expect(page.locator('h1')).not.toBeEmpty()
    await expect(page.locator('[data-result-percent]')).toContainText('80')
    await expect(page.locator('[data-no-scores]')).toBeVisible()
    await expect(page.locator('[data-scores]')).toBeHidden()
    await expect(page.locator('[data-cta-quiz]')).toHaveAttribute('href', quiz)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
}

test('exact scores in the query fill the headline and bars', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/?m=82&y=79&v=85')
  await expect(page.locator('[data-result-percent]')).toContainText('82')
  await expect(page.locator('[data-no-scores]')).toBeHidden()
  const bars = page.locator('[data-bars="you"]')
  await expect(bars.locator('[data-bar="markets"] [data-bar-value]')).toHaveText('82')
  await expect(bars.locator('[data-bar="environment"] [data-bar-value]')).toHaveText('79')
  await expect(bars.locator('[data-bar="freedom"] [data-bar-value]')).toHaveText('85')
})

test('scores that belong to another result page redirect to it, keeping the scores', async ({
  page,
}) => {
  await page.goto('/testi/tulos/pigou-80/?m=10&y=10&v=10')
  await expect(page).toHaveURL(/\/testi\/tulos\/free-10\/\?m=10&y=10&v=10$/)
  await expect(page.locator('[data-bars="you"] [data-bar="markets"] [data-bar-value]')).toHaveText(
    '10',
  )
})

test('tampered scores are clamped and rounded, and junk is ignored', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-100/?m=500&y=99999&v=100.4')
  await expect(page).toHaveURL(/\/pigou-100\/\?m=100&y=100&v=100$/)
  await page.goto('/testi/tulos/pigou-80/?m=<script>&y=1&v=2')
  await expect(page.locator('[data-no-scores]')).toBeVisible()
  await expect(page.locator('[data-scores]')).toBeHidden()
})

test('a friend comparison shows both sets of scores', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/?m=82&y=79&v=85&cm=10&cy=20&cv=30')
  const compare = page.locator('[data-compare]')
  await expect(compare).toBeVisible()
  await expect(
    compare.locator('[data-bars="compare-you"] [data-bar="markets"] [data-bar-value]'),
  ).toHaveText('82')
  await expect(
    compare.locator('[data-bars="compare-friend"] [data-bar="markets"] [data-bar-value]'),
  ).toHaveText('10')
  await expect(
    compare.locator('[data-compare-card="friend"] [data-compare-summary]'),
  ).toContainText('20')
})

test('a friend link without own scores shows no comparison', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/?cm=10&cy=20&cv=30')
  await expect(page.locator('[data-compare]')).toBeHidden()
  await expect(page.locator('[data-no-scores]')).toBeVisible()
})

test('unreachable result pages do not exist', async ({ request }) => {
  expect((await request.get('/testi/tulos/pigou-20/')).status()).toBe(404)
  expect((await request.get('/testi/tulos/wizard-50/')).status()).toBe(404)
})

test('how the quiz works lists the scoring and every question', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/')
  await page.locator('details summary').click()
  await expect(page.locator('details ol > li')).toHaveCount(10)
})

test('switching language keeps the scores', async ({ page }) => {
  await page.goto('/testi/tulos/pigou-80/?m=82&y=79&v=85#a=1,1,1,1,1,1,1,1,1')
  const sv = page.locator('nav a[href*="/sv/testi/tulos/pigou-80/"]').first()
  await expect(sv).toHaveAttribute('href', /\?m=82&y=79&v=85#a=1,1,1,1,1,1,1,1,1$/)
})

test('does not send the scores or answers anywhere', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => requests.push(r.url() + (r.postData() ?? '')))
  await page.goto('/testi/tulos/pigou-80/?m=82&y=79&v=85#a=2,2,2,2,2,2,2,2,2')
  await expect(page.locator('[data-bars="you"]')).toBeVisible()
  const leaking = requests.filter((u) => /[?&]m=82|a=2,2|y=79/.test(u.replace(/^[^?]*$/, '')))
  // The page itself is the only request that carries the query string.
  expect(leaking.filter((u) => !u.startsWith('http://localhost:4321/testi/tulos/'))).toEqual([])
})
