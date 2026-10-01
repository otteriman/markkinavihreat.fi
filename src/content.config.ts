import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'zod'

const locale = z.enum(['fi', 'sv', 'en'])

// Filenames encode the locale so translations of the same entry share a base
// slug: `<slug>.<locale>.md`. The translation-parity check (scripts/validate-translations.ts)
// and src/lib/content.ts's parseLocalizedId() rely on this convention to split
// ids back into slug + locale — so the id must keep the dot. Glob's default
// generateId() slugifies away dots (and would collide "foo.fi" / "foo.sv"),
// so every collection below overrides it to just strip the .md extension.
function generateId({ entry }: { entry: string }) {
  return entry.replace(/\.md$/, '')
}
const socialLink = z.object({
  type: z.enum([
    'website',
    'mastodon',
    'bluesky',
    'threads',
    'linkedin',
    'instagram',
    'facebook',
    'tiktok',
    'x',
    'youtube',
    'reddit',
  ]),
  url: z.url(),
  label: z.string().optional(),
})

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team', generateId }),
  schema: z.object({
    locale,
    name: z.string(),
    order: z.number(),
    photo: z.string(),
    candidateBadge: z.string().optional(),
    links: z
      .array(socialLink)
      .nullable()
      .optional()
      .transform((v) => v ?? []),
  }),
})

// A citation is an endorsement quote from a team member (src/content/team),
// referenced by that person's slug — not an external source link.
const citation = z.object({
  person: z.string(),
  quote: z.string(),
})

const programs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programs', generateId }),
  schema: z.object({
    locale,
    title: z.string(),
    description: z.string(),
    order: z.number(),
    // Publication dates, mirrored across all three locales of an entry (a
    // translation isn't a separate publication). Drive Article JSON-LD's
    // datePublished/dateModified, the sitemap's lastmod and the RSS feed —
    // so they track when the *content* changed, not when the file was touched.
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // Short label above the hero heading, e.g. "Markkinavihreät vaativat".
    heroKicker: z.string(),
    // The hero heading's display lines, e.g. ["Lisää", "markkinoita!"] — the
    // last line is rendered in the accent color.
    heroLines: z.array(z.string()).min(1),
    // Reachable at its own URL, but left out of the /ehdotukset/ index and
    // the sitemap — for a page that's ready to link to but not to announce.
    unlisted: z.boolean().default(false),
    citations: z.array(citation).default([]),
    // Shareable images shown at the very end of the page (paths under /public).
    visuals: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
  }),
})

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog', generateId }),
  schema: z.object({
    locale,
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().optional(),
  }),
})

const manifesto = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/manifesto', generateId }),
  schema: z.object({
    locale,
    title: z.string(),
  }),
})

export const collections = { team, programs, blog, manifesto }
