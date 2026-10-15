import { describe, expect, it } from 'vitest'
import {
  encodeAnswersHash,
  encodeChallenge,
  encodeScores,
  parseAnswersHash,
  parseChallenger,
  parseResultSlug,
  parseScore,
  parseScores,
  resultPath,
} from '../../src/lib/quiz/url'

describe('parseScore', () => {
  it('accepts integers 0–100', () => {
    expect(parseScore('0')).toBe(0)
    expect(parseScore('82')).toBe(82)
    expect(parseScore('100')).toBe(100)
  })

  it('clamps out-of-range values', () => {
    expect(parseScore('150')).toBe(100)
    expect(parseScore('-5')).toBeNull() // a minus sign is not a number we accept
    expect(parseScore('99999999999')).toBe(100)
  })

  it('rounds non-integers', () => {
    expect(parseScore('82.4')).toBe(82)
    expect(parseScore('82.5')).toBe(83)
  })

  it('rejects junk', () => {
    for (const bad of [
      '',
      ' ',
      'abc',
      '1e3',
      '0x10',
      'NaN',
      'Infinity',
      '<script>',
      null,
      undefined,
    ])
      expect(parseScore(bad as string | null)).toBeNull()
  })
})

describe('parseScores', () => {
  it('reads m, y and v', () => {
    expect(parseScores('?m=82&y=79&v=85')).toEqual({ markets: 82, environment: 79, freedom: 85 })
  })

  it('clamps and rounds each value', () => {
    expect(parseScores('m=500&y=12.6&v=0')).toEqual({ markets: 100, environment: 13, freedom: 0 })
  })

  it('returns null when any value is missing or invalid', () => {
    expect(parseScores('m=82&y=79')).toBeNull()
    expect(parseScores('m=82&y=x&v=85')).toBeNull()
    expect(parseScores('')).toBeNull()
  })

  it('reads the challenger separately', () => {
    const q = '?m=1&y=2&v=3&cm=40&cy=50&cz=1&cv=60'
    expect(parseChallenger(q)).toEqual({ markets: 40, environment: 50, freedom: 60 })
    expect(parseChallenger('?m=1&y=2&v=3')).toBeNull()
  })
})

describe('encoding', () => {
  const mine = { markets: 82, environment: 79, freedom: 85 }
  const theirs = { markets: 40, environment: 50, freedom: 60 }

  it('round-trips scores and challenger', () => {
    const q = encodeScores(mine, theirs)
    expect(parseScores(q)).toEqual(mine)
    expect(parseChallenger(q)).toEqual(theirs)
  })

  it('builds a challenge link out of your scores as cm/cy/cv', () => {
    const q = encodeChallenge(mine)
    expect(q).toBe('?cm=82&cy=79&cv=85')
    expect(parseChallenger(q)).toEqual(mine)
    expect(parseScores(q)).toBeNull()
  })
})

describe('answers hash', () => {
  it('round-trips nine answers', () => {
    const hash = encodeAnswersHash([2, 1, 0, -1, -2, null, 1, 1, 0])
    expect(hash).toBe('#a=2,1,0,-1,-2,0,1,1,0')
    expect(parseAnswersHash(hash, 9)).toEqual([2, 1, 0, -1, -2, 0, 1, 1, 0])
  })

  it('rejects the wrong length, out-of-range values and junk', () => {
    expect(parseAnswersHash('#a=1,2,3', 9)).toBeNull()
    expect(parseAnswersHash('#a=9,1,0,-1,-2,0,1,1,0', 9)).toBeNull()
    expect(parseAnswersHash('#a=1,2,x,0,0,0,0,0,0', 9)).toBeNull()
    expect(parseAnswersHash('', 9)).toBeNull()
  })
})

describe('parseResultSlug', () => {
  it('accepts reachable type/bucket pairs', () => {
    expect(parseResultSlug('pigou-80')).toEqual({ type: 'pigou', bucket: 80 })
  })

  it('rejects unreachable, malformed and unknown slugs', () => {
    expect(parseResultSlug('pigou-20')).toBeNull() // pigou needs every axis ≥ 60
    expect(parseResultSlug('pigou-75')).toBeNull()
    expect(parseResultSlug('wizard-50')).toBeNull()
    expect(parseResultSlug('pigou')).toBeNull()
    expect(parseResultSlug('../pigou-80')).toBeNull()
  })

  it('builds the path below the locale root', () => {
    expect(resultPath('pigou', 80)).toBe('/testi/tulos/pigou-80/')
  })
})
