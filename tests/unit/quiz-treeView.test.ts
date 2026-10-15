import { describe, expect, it } from 'vitest'
import { treeShapesFor } from '../../src/lib/quiz/tree'
import { blend, seedOf, timing, type Frame } from '../../src/lib/quiz/treeView'

const mid = { markets: 50, environment: 50, freedom: 50 }
const frame = (key: string, growth: number): Frame => {
  const s = treeShapesFor({ growth, ...mid }).find((x) => x.key === key)!
  return { tag: s.tag, num: s.num, str: s.str, inner: s.inner }
}

describe('blend', () => {
  it('starts at the old state and ends at the new one', () => {
    const from = frame('b:T', 0.5)
    const to = frame('b:T', 0.6)
    expect(blend(from, to, 0).num).toEqual(from.num)
    expect(blend(from, to, 1).num).toEqual(to.num)
  })

  it('moves the trunk smoothly in between', () => {
    const from = frame('b:T', 0.5)
    const to = frame('b:T', 0.6)
    const half = blend(from, to, 0.5).num
    expect(half.y2).toBeCloseTo((from.num.y2 + to.num.y2) / 2)
  })
})

describe('seedOf', () => {
  it('starts a new branch as a point at its parent tip', () => {
    const parent = frame('b:T', 0.6)
    const seed = seedOf(frame('b:TL', 0.6), parent)
    expect([seed.num.x1, seed.num.y1, seed.num.x2, seed.num.y2]).toEqual([
      parent.num.x2,
      parent.num.y2,
      parent.num.x2,
      parent.num.y2,
    ])
  })

  it('grows leaves from radius 0 and groups from scale 0', () => {
    const leaf = treeShapesFor({ growth: 1, ...mid }).find((s) => s.key.startsWith('l:'))!
    expect(seedOf(leaf).num.r).toBe(0)
    const fruit = treeShapesFor({ growth: 1, ...mid }).find((s) => s.tag === 'g')!
    expect(seedOf(fruit).num.s).toBe(0)
  })
})

describe('timing', () => {
  it('runs new branches before leaves, and leaves before fruit', () => {
    const [branch] = timing('b:TLR', 'enter')
    const [leaf] = timing('l:TLR', 'enter')
    const [fruit] = timing('f:TLRLR:coin', 'enter')
    expect(branch).toBeLessThan(leaf)
    expect(leaf).toBeLessThanOrEqual(fruit)
  })

  it('always finishes within the transition', () => {
    for (const key of ['b:TLRLRL', 'l:TL', 'crown', 'f:TL:apple', 'g:3', 'w:7'])
      for (const change of ['stay', 'enter', 'leave'] as const) {
        const [start, length] = timing(key, change)
        expect(start + length).toBeLessThanOrEqual(1)
      }
  })
})
