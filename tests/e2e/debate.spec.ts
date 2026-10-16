import { expect, test } from '@playwright/test'

// The debate game's page (the battle itself arrives in a later phase). Runs
// against the production build, where the page is noindex until launch and
// the /debate-lab/ workbench isn't built.

const pages = [
  {
    path: '/debaattipeli/',
    lang: 'fi',
    title: 'Vihreä väittely',
    opening: 'Vihervassarihan se siellä!',
  },
  { path: '/sv/debaattipeli/', lang: 'sv', title: 'Grön debatt', opening: 'en grön vänsterhippie' },
  { path: '/en/debaattipeli/', lang: 'en', title: 'Green debate', opening: 'a green leftie' },
]

for (const { path, lang, title, opening } of pages) {
  test(`debate page renders the stage (${lang})`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    const stage = page.getByRole('group', { name: title })
    await expect(stage).toBeVisible()
    await expect(stage.locator('[data-debate-top]')).toContainText(opening)
    await expect(stage.locator('svg')).toHaveCount(2)
  })
}

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
  const box = await page.locator('.debate-stage').boundingBox()
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
