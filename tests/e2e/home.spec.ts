import { expect, test } from '@playwright/test'

test('quote photo links to the same person page as the name', async ({ page }) => {
  await page.goto('/')
  const band = page.locator('.js-quote-slot').first()
  const nameHref = await band.locator('a.text-vihrea').getAttribute('href')
  expect(nameHref).toMatch(/^\/ketka\/[^/]+\/$/)
  await expect(band.locator(`a[href="${nameHref}"][tabindex="-1"]`)).toHaveCount(1)
})

test('home quote rotates while in view and stops when paused', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const slot = page.locator('.js-quote-slot').first()
  const quote = slot.locator('blockquote')
  await slot.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)

  const first = await quote.textContent()
  await page.clock.runFor(20_000)
  await expect(quote).not.toHaveText(first ?? '')

  await slot.getByRole('button').click()
  await expect(slot.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(0, 0)
  const paused = await quote.textContent()
  await page.clock.runFor(30_000)
  await expect(quote).toHaveText(paused ?? '')
})
