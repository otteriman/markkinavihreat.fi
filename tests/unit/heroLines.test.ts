import { describe, expect, it } from 'vitest'
import { heroSegments, lineSegments, plainHeroText } from '../../src/lib/heroLines'

describe('heroSegments', () => {
  it('accents the whole last line when no line has markers', () => {
    expect(heroSegments(['Lisää', 'markkinoita!'])).toEqual([
      [{ text: 'Lisää', accent: false }],
      [{ text: 'markkinoita!', accent: true }],
    ])
  })

  it('accents only the marked words when any line has markers', () => {
    expect(heroSegments(['Tehdään työstä', '*aina* kannattavaa'])).toEqual([
      [{ text: 'Tehdään työstä', accent: false }],
      [
        { text: 'aina', accent: true },
        { text: ' kannattavaa', accent: false },
      ],
    ])
  })
})

describe('lineSegments', () => {
  it('handles a marker in the middle of a line and several markers', () => {
    expect(lineSegments('työ *aina* ja *heti*')).toEqual([
      { text: 'työ ', accent: false },
      { text: 'aina', accent: true },
      { text: ' ja ', accent: false },
      { text: 'heti', accent: true },
    ])
  })
})

describe('plainHeroText', () => {
  it('drops the markers', () => {
    expect(plainHeroText(['Tehdään työstä', '*aina* kannattavaa'])).toBe(
      'Tehdään työstä aina kannattavaa',
    )
  })
})
