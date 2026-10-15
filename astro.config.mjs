// @ts-check
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// Set by the GitHub Pages preview workflow to serve from a repo subpath
// (e.g. "/markkinavihreat.fi"); unset everywhere else, including the
// Cloudflare production deploy, which serves from "/".
const base = process.env.BASE_PATH || '/'

// Content collections aren't queryable here (this runs before Astro's content
// layer syncs), so `unlisted: true` programs are found by reading their
// frontmatter directly — kept out of the sitemap the same way
// ProgramsIndexBody keeps them off the /ehdotukset/ listing.
function unlistedProgramSlugs() {
  const dir = fileURLToPath(new URL('./src/content/programs', import.meta.url))
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => /^unlisted:\s*true\s*$/m.test(readFileSync(`${dir}/${file}`, 'utf-8')))
    .map((file) => file.replace(/\.\w+\.md$/, ''))
}

const unlistedSlugs = unlistedProgramSlugs()

// The /blogi/ index renders in all three locales even with no posts, showing
// only "no posts yet". Three near-empty pages are a thin-content signal, so
// they stay out of the sitemap (and carry noindex, set in BlogIndexBody)
// until the first post lands. Self-healing: publishing a post re-includes them.
function hasBlogPosts() {
  const dir = fileURLToPath(new URL('./src/content/blog', import.meta.url))
  try {
    return readdirSync(dir).some((file) => file.endsWith('.md'))
  } catch {
    // The directory doesn't exist yet — the blog was unpublished in 4f9c4bc.
    return false
  }
}

const blogHasPosts = hasBlogPosts()

// Maps a program slug to its last content change, for the sitemap's <lastmod>.
// Same constraint as above — the content layer isn't available here — so the
// `published`/`updated` frontmatter (see src/content.config.ts) is read
// directly. Dates are mirrored across locales, so one file per slug suffices.
function programLastmod() {
  const dir = fileURLToPath(new URL('./src/content/programs', import.meta.url))
  const dates = new Map()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.fi.md'))) {
    const text = readFileSync(`${dir}/${file}`, 'utf-8')
    const date = (/^updated:\s*(\S+)\s*$/m.exec(text) ?? /^published:\s*(\S+)\s*$/m.exec(text))?.[1]
    if (date) dates.set(file.replace(/\.\w+\.md$/, ''), date)
  }
  return dates
}

const lastmodBySlug = programLastmod()

// https://astro.build/config
export default defineConfig({
  site: 'https://markkinavihreat.fi/',
  base,
  trailingSlash: 'always',
  output: 'static',
  compressHTML: true,

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      filter: (page) =>
        !unlistedSlugs.some((slug) => page.includes(`/ehdotukset/${slug}/`)) &&
        // The quiz is noindex until launch (see QuizBody.astro).
        !page.includes('/testi/') &&
        (blogHasPosts || !page.includes('/blogi/')),
      // Emits xhtml:link alternates per URL, so hreflang reaches crawlers via
      // the sitemap as well as the <head>. Mirrors BaseLayout's link rel=alternate.
      i18n: {
        defaultLocale: 'fi',
        locales: { fi: 'fi', sv: 'sv', en: 'en' },
      },
      serialize(item) {
        for (const [slug, date] of lastmodBySlug) {
          if (item.url.includes(`/ehdotukset/${slug}/`)) return { ...item, lastmod: date }
        }
        return item
      },
    }),
  ],
})
