import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'zod'
import { DISTRICTS } from './lib/districts'

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
    'wikipedia',
  ]),
  url: z.url(),
  label: z.string().optional(),
})

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team', generateId }),
  // `photo` is a path relative to the entry file (e.g. '../../assets/team/X.jpg'),
  // resolved by image() into ImageMetadata so astro:assets can emit resized
  // webp/avif variants instead of shipping the multi-megabyte originals.
  schema: ({ image }) =>
    z.object({
      locale,
      name: z.string(),
      order: z.number(),
      photo: image(),
      // A square headshot cropped so the face fills the same share of the
      // frame as everyone else's, for small round thumbnails (a program's
      // creators). The full photo's framing varies too much to crop by CSS.
      avatar: image().optional(),
      // The photo pre-cropped to the gallery's 3:4 card so every face sits at
      // the same size and height (face box ~60% of the frame height, centred
      // at 43%). The size is the tightest original's, so every crop lies
      // inside its photo — nothing is extended. Falls back to `photo`.
      card: image().optional(),
      candidateBadge: z.string().optional(),
      // A one-line teaser for the gallery card, when the person wants something
      // other than the bio's opening sentence there. The person page and its
      // JSON-LD still use the bio.
      summary: z.string().optional(),
      // Language-neutral key of the candidate's electoral district, for the
      // about page's candidate count and district filter. Required alongside
      // `candidateBadge` (checked in AboutBody.astro).
      district: z.enum(DISTRICTS).optional(),
      // The candidate's donation form on vihreat.fi, deep-linked to the
      // donate tab in this entry's language (the gallery's `kieli` is fi/se/en).
      donationUrl: z.url().optional(),
      // Identity anchors for entity reconciliation: the person's own canonical
      // about page (not just their site's home page) and their Wikidata item.
      // Both end up in the Person JSON-LD's sameAs, and both are rendered as
      // visible links on the person page — markup only states what's shown.
      profileUrl: z.url().optional(),
      wikidata: z
        .string()
        .regex(/^Q\d+$/)
        .optional(),
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
  // The body section (0-based, one per `##` heading) whose quote band this is.
  // Defaults to the citation's own position in the list, so the n-th quote
  // follows the n-th section. Setting it also pins the quote: the load-time
  // shuffle of quote bands only moves quotes that leave it unset.
  afterSection: z.number().int().min(0).optional(),
  // Places the quote inside that section, after its n-th paragraph (1-based),
  // splitting the section around the quote band. Left out, or at or past the
  // section's last paragraph, the quote follows the whole section. Also pins.
  afterParagraph: z.number().int().min(1).optional(),
})

const programs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programs', generateId }),
  schema: z.object({
    locale,
    title: z.string(),
    description: z.string(),
    // Publication dates, mirrored across all three locales of an entry (a
    // translation isn't a separate publication). Drive Article JSON-LD's
    // datePublished/dateModified, the sitemap's lastmod and the RSS feed —
    // so they track when the *content* changed, not when the file was touched.
    // `published` also orders every program listing, newest first.
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
    // Team member slugs who worked on the program without being quoted in it.
    contributors: z.array(z.string()).default([]),
    // Team member slugs of the program's makers ("Tekijät"). Set when a
    // program speaks for these people rather than for the whole network;
    // shown under the hero so readers see up front whose proposal it is.
    creators: z.array(z.string()).default([]),
    // The program's social-media carousel, offered for download and sharing
    // at the bottom of the page. Paths are public/ URLs (same-origin, so the
    // download attribute and the share sheet's file fetch both work).
    slides: z
      .object({
        // Language the slide images are in; a locale whose language differs
        // gets a note saying so.
        lang: locale,
        // The whole carousel as one PDF, for the "download all" link.
        pdf: z.string().optional(),
        // Pixel size shared by every slide (a carousel is uniform), so the
        // images reserve their space before loading.
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
      })
      .optional(),
  }),
})

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog', generateId }),
  schema: z.object({
    locale,
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    // Team member slugs (src/content/team), not free-text names — resolved to
    // linked names and Person JSON-LD. Unknown slugs fail the build (src/lib/team.ts).
    authors: z.array(z.string()).default([]),
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
