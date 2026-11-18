import { describe, expect, it } from 'vitest'
import { splitChartMarkers } from '../../src/lib/blogBody'

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
