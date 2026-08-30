import { describe, expect, it } from 'vitest'
import {
  assignSectionTones,
  parseProgramBody,
  type ProgramSection,
} from '../../src/lib/programSections'

const SAMPLE = `Lead paragraph one.

Lead paragraph two.

## Framing heading

Framing paragraph one.

> A pulled quote.

— Some Attribution

## Vaatimus 1/5: First requirement

Requirement lead.

Requirement body.

## Vaatimus 2/5: Second requirement

Only paragraph.

## Yhteenveto: closing heading

Closing paragraph.

## Usein kysytyt kysymykset

**Answered question?**
The answer.

**Unanswered question?**
`

describe('parseProgramBody', () => {
  const parsed = parseProgramBody(SAMPLE)

  it('extracts the lead paragraphs before the first heading as text', () => {
    expect(parsed.leadParagraphs).toEqual([
      { type: 'text', text: 'Lead paragraph one.' },
      { type: 'text', text: 'Lead paragraph two.' },
    ])
  })

  it('classifies a heading with no numbering as a highlight section', () => {
    expect(parsed.sections[0]).toEqual({
      type: 'highlight',
      heading: 'Framing heading',
      paragraphs: [
        { type: 'text', text: 'Framing paragraph one.' },
        { type: 'quote', text: 'A pulled quote.' },
        { type: 'attribution', text: '— Some Attribution' },
      ],
    })
  })

  it('classifies "Word N/M: Title" headings as numbered requirements', () => {
    expect(parsed.sections[1]).toEqual({
      type: 'requirement',
      label: 'Vaatimus 1 / 5',
      index: 1,
      total: 5,
      heading: 'First requirement',
      paragraphs: [
        { type: 'text', text: 'Requirement lead.' },
        { type: 'text', text: 'Requirement body.' },
      ],
    })
    expect(parsed.sections[2]).toMatchObject({ type: 'requirement', index: 2, total: 5 })
  })

  it('strips a "Word: " label prefix and capitalizes the closing heading', () => {
    expect(parsed.sections[3]).toEqual({
      type: 'highlight',
      heading: 'Closing heading',
      paragraphs: [{ type: 'text', text: 'Closing paragraph.' }],
    })
  })

  it('parses a block of "**Question**" paragraphs as an FAQ section', () => {
    expect(parsed.sections[4]).toEqual({
      type: 'faq',
      heading: 'Usein kysytyt kysymykset',
      items: [
        { question: 'Answered question?', answer: 'The answer.' },
        { question: 'Unanswered question?', answer: '' },
      ],
    })
  })

  it('returns no sections and empty lead for an empty body', () => {
    expect(parseProgramBody('')).toEqual({ leadParagraphs: [], sections: [] })
  })
})

describe('parseProgramBody chart markers', () => {
  it('classifies a lone "[kuvaaja: <id>]" paragraph as a chart', () => {
    const body = `## Osio\n\n[kuvaaja: ruokaostostuki-alv]\n\nMuu kappale.`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      type: 'highlight',
      paragraphs: [
        { type: 'chart', text: 'ruokaostostuki-alv' },
        { type: 'text', text: 'Muu kappale.' },
      ],
    })
  })

  it('does not treat an ordinary bracketed aside as a chart marker', () => {
    const body = `## Osio\n\n[jatkuu alempana]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [{ type: 'text', text: '[jatkuu alempana]' }],
    })
  })

  it('rejects an unrecognised id shape (uppercase, spaces) as plain text', () => {
    const body = `## Osio\n\n[kuvaaja: Not Valid]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [{ type: 'text', text: '[kuvaaja: Not Valid]' }],
    })
  })
})

describe('parseProgramBody video markers', () => {
  it('classifies a lone "[video: <id>]" paragraph as a video', () => {
    const body = `## Osio\n\nKatso video.\n\n[video: IpUvpkl-WfQ]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      type: 'highlight',
      paragraphs: [
        { type: 'text', text: 'Katso video.' },
        { type: 'video', text: 'IpUvpkl-WfQ' },
      ],
    })
  })

  it('does not treat an ordinary bracketed aside as a video marker', () => {
    const body = `## Osio\n\n[jatkuu alempana]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [{ type: 'text', text: '[jatkuu alempana]' }],
    })
  })
})

describe('parseProgramBody image markers', () => {
  it('classifies a lone "[kuva: <id>]" paragraph as an image', () => {
    const body = `## Osio\n\nKatso kuva.\n\n[kuva: ruuan-alv-esimerkki]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      type: 'highlight',
      paragraphs: [
        { type: 'text', text: 'Katso kuva.' },
        { type: 'image', text: 'ruuan-alv-esimerkki' },
      ],
    })
  })

  it('does not treat an ordinary bracketed aside as an image marker', () => {
    const body = `## Osio\n\n[jatkuu alempana]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [{ type: 'text', text: '[jatkuu alempana]' }],
    })
  })
})

describe('parseProgramBody disclosure markers', () => {
  it('classifies a "[laskelma: <trigger>]" paragraph as a disclosure, pairing the rest of the paragraph as its answer', () => {
    const body = `## Osio\n\nLyhyt yhteenveto.\n\n[laskelma: Kuinka luku laskettiin?]\nTässä on laskelma auki kirjoitettuna.`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      type: 'highlight',
      paragraphs: [
        { type: 'text', text: 'Lyhyt yhteenveto.' },
        {
          type: 'disclosure',
          question: 'Kuinka luku laskettiin?',
          text: 'Tässä on laskelma auki kirjoitettuna.',
        },
      ],
    })
  })

  it('does not treat a paragraph that only has the marker line, with no body, as a disclosure', () => {
    const body = `## Osio\n\n[laskelma: Kuinka luku laskettiin?]`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [{ type: 'text', text: '[laskelma: Kuinka luku laskettiin?]' }],
    })
  })

  it('keeps a single-line-break-separated body intact as one disclosure paragraph', () => {
    // A blank line would already have split this into a separate raw
    // paragraph upstream (and out of the disclosure) — a single line break
    // is how the body carries more than one rendered paragraph.
    const body = `## Osio\n\n[laskelma: Kuinka luku laskettiin?]\nEnsimmäinen kappale.\nToinen kappale.`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      paragraphs: [
        {
          type: 'disclosure',
          question: 'Kuinka luku laskettiin?',
          text: 'Ensimmäinen kappale.\nToinen kappale.',
        },
      ],
    })
  })

  it('does NOT treat an ordinary "**bold**" leading paragraph as a disclosure — only [laskelma: ...] triggers one', () => {
    // Regression guard: closing-punchline paragraphs across the existing
    // programs start with "**bold sentence**" purely for emphasis, mixed in
    // among plain paragraphs (see e.g. lisaa-markkinoita.fi.md and this
    // program's own "Mitä tästä seuraa" section) — these must keep rendering
    // as plain text, not collapse into an accordion. Two paragraphs here,
    // one of which doesn't match FAQ_ITEM's shape, so this reproduces the
    // real files' mixed-content section shape rather than the (unrelated,
    // pre-existing) whole-section FAQ heuristic, which only fires when every
    // paragraph in the section matches.
    const body = `## Osio\n\nJohdantokappale.\n\n**Tämä on korostettu lause.** Loppuosa tekstistä.`
    const parsed = parseProgramBody(body)
    expect(parsed.sections[0]).toMatchObject({
      type: 'highlight',
      paragraphs: [
        { type: 'text', text: 'Johdantokappale.' },
        { type: 'text', text: '**Tämä on korostettu lause.** Loppuosa tekstistä.' },
      ],
    })
  })
})

describe('assignSectionTones', () => {
  it('keeps the opening and closing highlight dark and alternates numbered requirements', () => {
    // Shape of "lisaa-markkinoita.fi.md": highlight, 5 requirements, highlight.
    const sections: ProgramSection[] = [
      { type: 'highlight', heading: 'Intro', paragraphs: [] },
      {
        type: 'requirement',
        label: 'Vaatimus 1 / 5',
        index: 1,
        total: 5,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Vaatimus 2 / 5',
        index: 2,
        total: 5,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Vaatimus 3 / 5',
        index: 3,
        total: 5,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Vaatimus 4 / 5',
        index: 4,
        total: 5,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Vaatimus 5 / 5',
        index: 5,
        total: 5,
        heading: '',
        paragraphs: [],
      },
      { type: 'highlight', heading: 'Summary', paragraphs: [] },
    ]
    expect(assignSectionTones(sections)).toEqual([
      'dark',
      'light',
      'tint',
      'light',
      'tint',
      'light',
      'dark',
    ])
  })

  it('treats a single highlight section as both first and last (dark)', () => {
    // Shape of the sv/en "Translation coming soon" stubs.
    const sections: ProgramSection[] = [{ type: 'highlight', heading: 'Stub', paragraphs: [] }]
    expect(assignSectionTones(sections)).toEqual(['dark'])
  })

  it('keeps an FAQ section after the closing highlight dark and does not disturb it', () => {
    // Shape of "palkalla-pitaa-voida-vaurastua.fi.md": highlight, 4 requirements, highlight, faq.
    const sections: ProgramSection[] = [
      { type: 'highlight', heading: 'Intro', paragraphs: [] },
      {
        type: 'requirement',
        label: 'Hyöty 1 / 4',
        index: 1,
        total: 4,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Hyöty 2 / 4',
        index: 2,
        total: 4,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Hyöty 3 / 4',
        index: 3,
        total: 4,
        heading: '',
        paragraphs: [],
      },
      {
        type: 'requirement',
        label: 'Hyöty 4 / 4',
        index: 4,
        total: 4,
        heading: '',
        paragraphs: [],
      },
      { type: 'highlight', heading: 'Summary', paragraphs: [] },
      { type: 'faq', heading: 'FAQ', items: [] },
    ]
    expect(assignSectionTones(sections)).toEqual([
      'dark',
      'light',
      'tint',
      'light',
      'tint',
      'dark',
      'dark',
    ])
  })

  it('alternates interior unnumbered highlights along with numbered requirements', () => {
    // Shape of "ruokaostostuki": highlight, highlight, highlight, requirement,
    // highlight, highlight, highlight, faq — first/last stay dark, everything
    // else (numbered or not) shares one alternating band position.
    const sections: ProgramSection[] = [
      { type: 'highlight', heading: 'Mistä on kyse', paragraphs: [] },
      { type: 'highlight', heading: 'Ongelma kasvaa', paragraphs: [] },
      { type: 'highlight', heading: 'Vain kaupan kassalla', paragraphs: [] },
      {
        type: 'requirement',
        label: 'Ratkaisu 1 / 1',
        index: 1,
        total: 1,
        heading: '',
        paragraphs: [],
      },
      { type: 'highlight', heading: 'Kynnyskysymys', paragraphs: [] },
      { type: 'highlight', heading: 'Mitä seuraa', paragraphs: [] },
      { type: 'faq', heading: 'FAQ', items: [] },
    ]
    expect(assignSectionTones(sections)).toEqual([
      'dark',
      'light',
      'tint',
      'light',
      'tint',
      'dark',
      'dark',
    ])
  })
})
