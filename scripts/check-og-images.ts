/**
 * Post-build guard for the one OG invariant: every `og:image` a page emits must
 * resolve to a PNG that the same build generated. BaseLayout auto-emits og:image
 * for all non-noindex pages, while ogPages() (src/lib/ogImage.ts) is a
 * hand-maintained catalog — add a page type without adding it there and you get
 * a silent production 404. This scans dist/ and fails the build if that happens.
 *
 * Run after `astro build` (see the CI build job). Expects the default base ("/"),
 * i.e. og:image URLs are absolute production URLs under SITE.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const SITE = 'https://markkinavihreat.fi'

const htmlFiles = (readdirSync(DIST, { recursive: true, encoding: 'utf-8' }) as string[]).filter(
  (file) => file.endsWith('.html'),
)

const missing: Array<{ html: string; url: string }> = []
let tags = 0

for (const relHtml of htmlFiles) {
  const html = join(DIST, relHtml)
  const content = readFileSync(html, 'utf-8')
  for (const match of content.matchAll(/property="og:image" content="([^"]+)"/g)) {
    tags++
    const url = match[1]
    const relImage = url.startsWith(`${SITE}/`) ? url.slice(SITE.length + 1) : url
    if (!existsSync(join(DIST, relImage))) missing.push({ html: relHtml, url })
  }
}

if (tags === 0) {
  console.error('OG guard FAILED: no og:image tags found in dist/ — OG generation is broken.')
  process.exit(1)
}

if (missing.length > 0) {
  console.error(`OG guard FAILED: ${missing.length} og:image tag(s) point to a missing file:`)
  for (const { html, url } of missing) console.error(`  ${url}  (referenced by ${html})`)
  process.exit(1)
}

console.log(`OG guard OK: ${tags} og:image tag(s), all resolve to files in ${DIST}/.`)
