import type { APIRoute } from 'astro'
import { ogSlug } from '../../../lib/og'
import { ogPages, renderOgPng, type OgPage } from '../../../lib/ogImage'

// Static endpoint: one PNG per indexable page, generated at build time into
// dist/images/og/<slug>.png. The slug comes from the same ogSlug() BaseLayout
// uses for the og:image URL, so every emitted <meta> resolves to a real file.
export async function getStaticPaths() {
  const pages = await ogPages()
  return pages.map((page) => ({
    params: { slug: ogSlug(page.locale, page.path) },
    props: page,
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, lines, accent } = props as OgPage
  const png = await renderOgPng({ eyebrow, lines, accent })
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
