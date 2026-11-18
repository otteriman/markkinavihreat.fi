import { describe, expect, it } from 'vitest'
import { splitChartMarkers, withBaseLinks } from '../../src/lib/blogBody'

describe('splitChartMarkers', () => {
  it('splits rendered HTML around chart marker paragraphs', () => {
    const html = '<h2>A</h2>\n<p>[kuvaaja: konkurssit]</p>\n<p>Text.</p>'
    expect(splitChartMarkers(html)).toEqual([
      { type: 'html', html: '<h2>A</h2>\n' },
      { type: 'chart', id: 'konkurssit' },
      { type: 'html', html: '\n<p>Text.</p>' },
    ])
  })

  it('leaves a bracketed aside inside running text alone', () => {
    const html = '<p>See [kuvaaja: konkurssit] above.</p>'
    expect(splitChartMarkers(html)).toEqual([{ type: 'html', html }])
  })

  it('handles adjacent markers without empty segments', () => {
    expect(splitChartMarkers('<p>[kuvaaja: a]</p>\n<p>[kuvaaja: b]</p>')).toEqual([
      { type: 'chart', id: 'a' },
      { type: 'chart', id: 'b' },
    ])
  })
})

describe('withBaseLinks', () => {
  const html =
    '<p><a href="/ehdotukset/x/">a</a> <a href="https://stat.fi/">b</a> <a href="//cdn.example/">c</a></p>'

  it('prefixes only root-relative links with the base path', () => {
    expect(withBaseLinks(html, '/markkinavihreat.fi/claude-x/')).toBe(
      '<p><a href="/markkinavihreat.fi/claude-x/ehdotukset/x/">a</a> <a href="https://stat.fi/">b</a> <a href="//cdn.example/">c</a></p>',
    )
  })

  it('leaves the HTML alone when the base is "/"', () => {
    expect(withBaseLinks(html, '/')).toBe(html)
  })
})
