import { expect, test } from '@playwright/test'

const POST_PATH = '/blogi/2026-11-18/orpon-hallitus-on-epaonnistunut/'

test('blog post renders its charts in place of the markers', async ({ page }) => {
  await page.goto(POST_PATH)
  const charts = page.locator('figure[data-gov-chart]')
  await expect(charts).toHaveCount(7)
  // Exactly one of each chart's two layouts is displayed.
  for (const chart of await charts.all()) {
    await expect(chart.locator('svg[role="img"]:visible')).toHaveCount(1)
  }
  await expect(page.getByText('[kuvaaja:')).toHaveCount(0)
  await expect(charts.first().getByText('Lähde:')).toBeVisible()
})

test('blog post chart figures are readable as a table without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(POST_PATH)
  const chart = page.locator('figure[data-gov-chart]', {
    has: page.getByRole('heading', { name: 'Asunnottomuustilanne on pahentunut' }),
  })
  await chart.getByText('Näytä luvut taulukkona').click()
  const table = chart.getByRole('table')
  await expect(table.getByRole('row', { name: /2025/ })).toContainText('4 579')
  await context.close()
})

test('blog post chart shows a tooltip on hover', async ({ page }) => {
  await page.goto(POST_PATH)
  const chart = page.locator('figure[data-gov-chart]', {
    has: page.getByRole('heading', { name: 'Velkatilanne on heikentynyt' }),
  })
  const svg = chart.locator('svg:visible')
  await svg.scrollIntoViewIfNeeded()
  const box = (await svg.boundingBox())!
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
  await expect(chart.locator('[data-tooltip]:visible')).toContainText('90,3 %')
})

test('blog post charts are localized', async ({ page }) => {
  await page.goto(`/en${POST_PATH}`)
  // The government labels on the chart itself are the only key to its colours.
  const labels = page.locator('figure[data-gov-chart]').first().locator('svg:visible tspan')
  await expect(labels.filter({ hasText: /^Previous$/ })).toHaveCount(1)
  await expect(labels.filter({ hasText: /^Orpo$/ })).toHaveCount(1)
  await expect(labels.filter({ hasText: /^government$/ })).toHaveCount(2)
})
