import { describe, expect, it } from 'vitest'
import {
  depthFor,
  express,
  fruitCount,
  renderTree,
  treeHeight,
  treeShapesFor,
  VIEW,
  type Layer,
  type TreeInput,
} from '../../src/lib/quiz/tree'
import { AXES } from '../../src/lib/quiz/types'

const mid = { markets: 50, environment: 50, freedom: 50 }
const STAGES = Array.from({ length: 10 }, (_, i) => (i + 1) / 10)
const EXTREMES = [0, 25, 50, 75, 100]

function treeBox(input: TreeInput) {
  const tree = treeShapesFor(input).filter((s) => s.layer === 'tree')
  return {
    top: Math.min(...tree.map((s) => s.box.y0)),
    left: Math.min(...tree.map((s) => s.box.x0)),
    right: Math.max(...tree.map((s) => s.box.x1)),
  }
}

/** Number of drawn primitives (circles, paths, …) in the given layers. */
const count = (input: TreeInput, layers: Layer[]) =>
  treeShapesFor(input)
    .filter((s) => layers.includes(s.layer))
    .reduce((sum, s) => sum + (s.svg.match(/<(circle|ellipse|rect|line|path)\b/g)?.length ?? 0), 0)

describe('determinism', () => {
  it('gives an identical SVG string for identical input', () => {
    const input = { growth: 0.7, markets: 33, environment: 81, freedom: 12 }
    expect(renderTree(input)).toBe(renderTree({ ...input }))
  })

  it('gives every shape a unique, stable key', () => {
    for (const growth of STAGES) {
      const keys = treeShapesFor({ growth, ...mid }).map((s) => s.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
    // A branch keeps its key from one stage to the next.
    const before = new Set(treeShapesFor({ growth: 0.5, ...mid }).map((s) => s.key))
    const after = new Set(treeShapesFor({ growth: 0.6, ...mid }).map((s) => s.key))
    expect([...before].filter((k) => k.startsWith('b:')).every((k) => after.has(k))).toBe(true)
  })

  it('animates butterflies and birds only when motion is allowed', () => {
    const svg = renderTree({ growth: 1, ...mid, environment: 100 })
    expect(svg).toContain('class="qt-wing-l"')
    expect(svg).toContain('class="qt-wl"')
    expect(svg).toContain('class="qt-fly"')
    expect(svg).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*animation:none/)
  })

  it('changes when the scores change', () => {
    expect(renderTree({ growth: 1, ...mid })).not.toBe(
      renderTree({ growth: 1, ...mid, freedom: 90 }),
    )
  })
})

describe('size depends on growth only', () => {
  it.each(STAGES)('keeps the height within ±3 %% across all scores at growth %s', (growth) => {
    const target = treeHeight(growth)
    for (const markets of EXTREMES)
      for (const environment of EXTREMES)
        for (const freedom of EXTREMES) {
          const height = VIEW.groundY - treeBox({ growth, markets, environment, freedom }).top
          expect(Math.abs(height - target) / target).toBeLessThanOrEqual(0.03)
        }
  })

  it('grows taller and deeper with every stage', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(treeHeight(STAGES[i])).toBeGreaterThan(treeHeight(STAGES[i - 1]))
      expect(depthFor(STAGES[i])).toBeGreaterThanOrEqual(depthFor(STAGES[i - 1]))
    }
    expect(depthFor(0.1)).toBe(1)
    expect(depthFor(1)).toBe(6)
  })

  it('stays inside the picture for every combination', () => {
    for (const growth of STAGES)
      for (const freedom of EXTREMES)
        for (const markets of [0, 100]) {
          const box = treeBox({ growth, markets, environment: 50, freedom })
          expect(box.top).toBeGreaterThanOrEqual(0)
          expect(box.left).toBeGreaterThanOrEqual(0)
          expect(box.right).toBeLessThanOrEqual(VIEW.width)
        }
  })
})

describe('traits', () => {
  it('only bears fruit in the last three stages', () => {
    expect(STAGES.map(fruitCount)).toEqual([0, 0, 0, 0, 0, 0, 0, 6, 9, 12])
    expect(count({ growth: 0.7, ...mid }, ['fruit'])).toBe(0)
    expect(count({ growth: 1, ...mid }, ['fruit'])).toBeGreaterThan(0)
  })

  it('shows traits only faintly early on and fully at the end', () => {
    expect(express(100, 0)).toBe(0.5)
    expect(express(100, 1)).toBe(1)
    expect(express(0, 0.5)).toBe(0.25)
  })

  it('keeps a couple of apples and adds banknotes at markets 100', () => {
    const fruit = treeShapesFor({ growth: 1, ...mid, markets: 100 }).filter(
      (s) => s.layer === 'fruit',
    )
    expect(
      fruit.filter((s) => s.svg.includes('<circle') && s.svg.includes('#C95B3D')),
    ).toHaveLength(2)
    expect(fruit.some((s) => s.svg.includes('#D3E8BC'))).toBe(true)
  })

  it('turns apples into coins as the markets score rises', () => {
    const coins = (markets: number) =>
      treeShapesFor({ growth: 1, ...mid, markets }).filter(
        (s) => s.layer === 'fruit' && s.svg.includes('#E8B931'),
      ).length
    expect(coins(0)).toBe(0)
    expect(coins(50)).toBeGreaterThan(0)
    expect(coins(100)).toBeGreaterThan(coins(50))
  })

  // Neither end of an axis may look "empty" (plan section 7.5).
  it.each(AXES)('keeps the %s trait layer within 30 %% in element count at 0 vs 100', (axis) => {
    const layers: Record<string, Layer[]> = {
      markets: ['fruit'],
      environment: ['garden', 'wild'],
      freedom: ['tree'],
    }
    const low = count({ growth: 1, ...mid, [axis]: 0 }, layers[axis])
    const high = count({ growth: 1, ...mid, [axis]: 100 }, layers[axis])
    expect(Math.abs(low - high) / Math.max(low, high)).toBeLessThanOrEqual(0.3)
  })
})
