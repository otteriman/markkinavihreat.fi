import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCollection, getEntry } from 'astro:content'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { LOCALES, parseLocalizedId, type Locale } from './content'
import { about, blogPage, contact, home, programsPage } from '../i18n/pages'

// Brand tokens, kept in sync with src/styles/global.css. Accent is the Vihreät
// brand green, matching the logo fill so text and mark read as one.
const BG = '#efeee9' // --color-kerma
const INK = '#161a14' // --color-musta
const ACCENT = '#006845' // --color-vihreat-brand

const WIDTH = 1200
const HEIGHT = 600

/**
 * One page's OG image content. The green accent follows vaihdavihreisiin's look:
 * - 'lastLine' — the whole last line green (program heroLines already split this way)
 * - 'lastWord' — only the last word of the (single) title line green
 * - 'none'     — all ink
 */
export interface OgPage {
  locale: Locale
  path: string
  eyebrow: string
  lines: string[]
  accent: 'lastLine' | 'lastWord' | 'none'
}

// Read fonts and the logo once, at module load (build time only — this module
// is imported solely by the OG endpoint, never shipped to the browser).
const ROOT = process.cwd()
const fontSemiBold = readFileSync(join(ROOT, 'src/assets/fonts/HankenGrotesk-SemiBold.ttf'))
const fontExtraBold = readFileSync(join(ROOT, 'src/assets/fonts/HankenGrotesk-ExtraBold.ttf'))
const logoSvg = readFileSync(join(ROOT, 'src/assets/vihreat-logo.svg'))
const logoDataUri = `data:image/svg+xml;base64,${logoSvg.toString('base64')}`

// satori accepts a React-element-shaped object ({ type, props }); we build that
// directly to avoid pulling JSX/React into a plain .ts module.
type Node = { type: string; props: Record<string, unknown> }
const el = (type: string, props: Record<string, unknown>): Node => ({ type, props })

const lineStyle = {
  fontSize: 64,
  fontWeight: 800,
  lineHeight: 1.05,
  letterSpacing: '-0.02em',
  maxWidth: `${WIDTH - 200}px`,
}

// Renders one title line. The last line carries the green accent: either the
// whole line ('lastLine') or just its final word ('lastWord', as inline spans
// so a wrapped title keeps the green word attached wherever it lands).
function titleLine(line: string, isLast: boolean, accent: OgPage['accent']): Node {
  if (isLast && accent === 'lastLine') {
    return el('div', { style: { ...lineStyle, color: ACCENT }, children: line })
  }
  if (isLast && accent === 'lastWord') {
    const words = line.split(' ')
    const tail = words.pop() ?? line
    const head = words.join(' ')
    return el('div', {
      style: {
        ...lineStyle,
        color: INK,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
      },
      children: [
        ...(head ? [el('span', { children: `${head} ` })] : []),
        el('span', { style: { color: ACCENT }, children: tail }),
      ],
    })
  }
  return el('div', { style: { ...lineStyle, color: INK }, children: line })
}

function markup({ eyebrow, lines, accent }: Omit<OgPage, 'locale' | 'path'>): Node {
  return el('div', {
    style: {
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: BG,
      padding: '56px 80px',
      fontFamily: 'Hanken Grotesk',
    },
    children: [
      el('div', {
        style: {
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: INK,
          marginBottom: 32,
        },
        children: eyebrow,
      }),
      el('img', { src: logoDataUri, width: 132, height: 132, style: { marginBottom: 32 } }),
      el('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        },
        children: lines.map((line, i) => titleLine(line, i === lines.length - 1, accent)),
      }),
    ],
  })
}

/** Render a page's OG image to a PNG buffer. */
export async function renderOgPng(
  page: Omit<OgPage, 'locale' | 'path'>,
): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await satori(markup(page) as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Hanken Grotesk', data: fontSemiBold, weight: 600, style: 'normal' },
      { name: 'Hanken Grotesk', data: fontExtraBold, weight: 800, style: 'normal' },
    ],
  })
  // Copy into a plain ArrayBuffer-backed view so it satisfies Response's BodyInit
  // (resvg types the result as Uint8Array<ArrayBufferLike>, which BodyInit rejects).
  return new Uint8Array(new Resvg(svg).render().asPng())
}

/**
 * Every indexable page that gets an OG image, assembled from the same copy the
 * pages themselves render (i18n/pages.ts + content collections). Must match the
 * set of pages BaseLayout emits og:image for (all non-noindex pages): unlisted
 * programs are noindex, so they're skipped here too.
 *
 * Static pages reuse their visible headline with the fixed brand eyebrow;
 * program pages reuse heroKicker + heroLines (last line already the accent).
 */
export async function ogPages(): Promise<OgPage[]> {
  const pages: OgPage[] = []

  for (const locale of LOCALES) {
    const brand = home[locale].eyebrow
    const manifesto = await getEntry('manifesto', `manifesto.${locale}`)
    if (!manifesto) throw new Error(`Missing manifesto content for locale "${locale}"`)

    const staticPages: Array<{ path: string; title: string }> = [
      { path: '/', title: home[locale].title },
      { path: '/manifesti/', title: manifesto.data.title },
      { path: '/ketka/', title: about[locale].title },
      { path: '/yhteystiedot/', title: contact[locale].title },
      { path: '/ehdotukset/', title: programsPage[locale].title },
      { path: '/blogi/', title: blogPage[locale].title },
    ]
    for (const { path, title } of staticPages) {
      pages.push({ locale, path, eyebrow: brand, lines: [title], accent: 'lastWord' })
    }
  }

  const programs = await getCollection('programs')
  for (const program of programs) {
    if (program.data.unlisted) continue
    const { slug, locale } = parseLocalizedId(program.id)
    pages.push({
      locale,
      path: `/ehdotukset/${slug}/`,
      eyebrow: program.data.heroKicker,
      lines: program.data.heroLines,
      accent: 'lastLine',
    })
  }

  return pages
}
