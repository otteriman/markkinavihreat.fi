export interface ProgramParagraph {
  /**
   * `quote`/`attribution` are for an inline pull-quote (`> ...` / `— ...`).
   * `chart` is a `[kuvaaja: <id>]` marker paragraph — `text` holds the chart id,
   * not prose, and the renderer looks it up rather than displaying it as-is.
   * Everything else is `text`.
   */
  type: 'text' | 'quote' | 'attribution' | 'chart'
  text: string
}

export interface ProgramHighlightSection {
  type: 'highlight'
  heading: string
  paragraphs: ProgramParagraph[]
}

export interface ProgramRequirementSection {
  type: 'requirement'
  label: string
  index: number
  total: number
  heading: string
  paragraphs: ProgramParagraph[]
}

export interface ProgramFaqItem {
  question: string
  /** May be empty — an unanswered question is left out of the accordion by the caller, or shown as-is. */
  answer: string
}

export interface ProgramFaqSection {
  type: 'faq'
  heading: string
  items: ProgramFaqItem[]
}

export type ProgramSection = ProgramHighlightSection | ProgramRequirementSection | ProgramFaqSection

/**
 * `dark` — the framing/summary bands (bg-metsa).
 * `light` / `tint` — the alternating pale bands the argument runs through.
 */
export type ProgramSectionTone = 'dark' | 'light' | 'tint'

export interface ParsedProgramBody {
  /** Paragraph(s) before the first heading — the hero's lead-in text. */
  leadParagraphs: ProgramParagraph[]
  sections: ProgramSection[]
}

// "Vaatimus 1/5: ...", "Demand 1/5: ...", "Krav 1/5: ..." — the leading word
// is locale-specific, so we match its shape rather than any fixed language.
const REQUIREMENT_HEADING = /^(\S+)\s+(\d+)\/(\d+):\s*(.+)$/
// "Yhteenveto: ..." / "Summary: ..." — any other "Word: rest" heading. The
// original site never shows this label in the rendered heading, so we strip it.
const LABELED_HEADING = /^[^:]+:\s*(.+)$/
// "**Question?**" optionally followed by a hard-break and its answer — the
// authoring convention for FAQ sections (see content/programs/*.md).
const FAQ_ITEM = /^\*\*(.+?)\*\*\s*([\s\S]*)$/
// "[kuvaaja: <id>]" on its own paragraph — a marker for a registered chart
// component, keyed by id. Anchored to the whole paragraph so an ordinary
// bracketed aside in body text (e.g. "[jatkuu...]") is never mistaken for one.
const CHART_MARKER = /^\[kuvaaja:\s*([a-z0-9-]+)\]$/

function splitRawParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function classifyParagraph(raw: string): ProgramParagraph {
  if (raw.startsWith('> ')) return { type: 'quote', text: raw.slice(2).trim() }
  if (raw.startsWith('—')) return { type: 'attribution', text: raw }
  const chartMatch = raw.match(CHART_MARKER)
  if (chartMatch) return { type: 'chart', text: chartMatch[1] }
  return { type: 'text', text: raw }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A block is an FAQ section once every paragraph in it is a "**Question**" item. */
function parseFaqItems(rawParagraphs: string[]): ProgramFaqItem[] | null {
  if (rawParagraphs.length === 0 || !rawParagraphs.every((p) => FAQ_ITEM.test(p))) return null
  return rawParagraphs.map((p) => {
    const [, question, answer] = p.match(FAQ_ITEM)!
    return { question: question.trim(), answer: answer.trim() }
  })
}

/**
 * Splits a program's markdown body into the hero lead-in and its `##`
 * sections, classifying each section as a numbered requirement ("Vaatimus
 * N/5: ..."), an FAQ block, or a plain highlight band (the framing intro and
 * the closing summary). Keeps content authoring in plain markdown while
 * letting ProgramDetailBody lay sections out with alternating styles and
 * interleave quote bands between them.
 */
export function parseProgramBody(body: string): ParsedProgramBody {
  const blocks = body.trim().split(/\n(?=## )/)

  let lead = ''
  let headingBlocks = blocks
  if (!blocks[0]?.startsWith('## ')) {
    lead = blocks[0] ?? ''
    headingBlocks = blocks.slice(1)
  }

  const sections: ProgramSection[] = headingBlocks.map((block) => {
    const newlineIndex = block.indexOf('\n')
    const headingLine = (newlineIndex === -1 ? block : block.slice(0, newlineIndex))
      .replace(/^##\s*/, '')
      .trim()
    const content = newlineIndex === -1 ? '' : block.slice(newlineIndex + 1)
    const rawParagraphs = splitRawParagraphs(content)

    const faqItems = parseFaqItems(rawParagraphs)
    if (faqItems) {
      return { type: 'faq', heading: headingLine, items: faqItems }
    }

    const paragraphs = rawParagraphs.map(classifyParagraph)

    const requirementMatch = headingLine.match(REQUIREMENT_HEADING)
    if (requirementMatch) {
      const [, word, index, total, title] = requirementMatch
      return {
        type: 'requirement',
        label: `${word} ${index} / ${total}`,
        index: Number(index),
        total: Number(total),
        heading: title,
        paragraphs,
      }
    }

    const labeledMatch = headingLine.match(LABELED_HEADING)
    return {
      type: 'highlight',
      heading: labeledMatch ? capitalize(labeledMatch[1]) : headingLine,
      paragraphs,
    }
  })

  return { leadParagraphs: splitRawParagraphs(lead).map(classifyParagraph), sections }
}

/**
 * Picks a background tone per section so a program reads as alternating bands.
 *
 * The opening and closing highlight bands stay dark — they frame the page. A
 * program that argues its way through several *unnumbered* sections in between
 * (problem → solution → threshold, rather than "Vaatimus N/5") would otherwise
 * render as one long dark wall, so those interior highlights join the numbered
 * requirements in the light/tint alternation. Programs whose only highlights
 * are the first and last one are unaffected.
 *
 * FAQ sections don't render as a band; they get a tone only to keep the result
 * index-aligned with `sections`.
 */
export function assignSectionTones(sections: ProgramSection[]): ProgramSectionTone[] {
  const highlights = sections.flatMap((section, i) => (section.type === 'highlight' ? [i] : []))
  const first = highlights[0]
  const last = highlights[highlights.length - 1]

  let band = 0
  return sections.map((section, i) => {
    if (section.type === 'faq') return 'dark'
    if (section.type === 'highlight' && (i === first || i === last)) return 'dark'
    return band++ % 2 === 0 ? 'light' : 'tint'
  })
}
