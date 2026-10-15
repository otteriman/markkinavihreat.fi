/**
 * Deterministic tree generator for the quiz (plan sections 7.3–7.5), style A:
 * flat and geometric.
 *
 * - `growth` (0–1) alone sets the tree's size: height, branch depth, leaf count.
 *   The tree's height is exactly treeHeight(growth), whatever the scores.
 * - Each axis sets a trait with two equally pleasant ends:
 *   markets → fruit (apples … coins), freedom → crown (pruned … wild),
 *   environment → life around the tree (tidy garden … flowers, bees, birds).
 * - Trait expression scales with growth, so it is subtle early on and fully
 *   visible at the end.
 * - Every random choice comes from a hash of a fixed seed and the element's
 *   own position in the tree, so identical inputs give an identical SVG and a
 *   branch keeps its shape from one growth stage to the next.
 */
import type { Scores } from './types'

/**
 * Drawing styles under review (plan section 7.4). All three share the same
 * geometry, keys and traits; only the painting differs.
 * - flat: flat, geometric colour shapes (style A)
 * - line: single-weight line art, white shapes with one even outline (style B)
 * - paper: paper-cut layers in soft colours, each piece on a flat paper edge (style C)
 */
export type TreeStyle = 'flat' | 'line' | 'paper'
export const TREE_STYLES: TreeStyle[] = ['flat', 'line', 'paper']
/** Style C, chosen in review. */
export const DEFAULT_STYLE: TreeStyle = 'paper'

export interface TreeInput extends Scores {
  growth: number
  /** Defaults to DEFAULT_STYLE. */
  style?: TreeStyle
}

export type Layer = 'ground' | 'garden' | 'wild' | 'tree' | 'fruit'

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * One drawn element. `key` is stable across growth stages and scores (a
 * branch keeps its key as the tree grows), which is what lets the animator
 * (treeView.ts) morph one stage into the next. Plain elements carry their
 * numeric attributes in `num`; groups (tag 'g') are placed by `num.tx`,
 * `num.ty` and scaled by `num.s`, with their content in `inner`.
 */
export interface Shape {
  layer: Layer
  key: string
  tag: 'line' | 'circle' | 'ellipse' | 'g'
  num: Record<string, number>
  str: Record<string, string>
  inner?: string
  box: Box
  svg: string
}

export const VIEW = { width: 480, height: 400, baseX: 240, groundY: 350 }

export const COLORS = {
  leaf: '#6EB82A', // --color-vihrea
  leafDark: '#2E5E1A', // --color-vihrea-tumma
  coin: '#E8B931', // --color-aurinko
  ink: '#161A14', // --color-musta
  apple: '#C95B3D', // --color-terra
  stone: '#E2E1DB', // --color-kerma-syva
  petal: '#FFFFFF',
  bill: '#D3E8BC', // a pale banknote green, tinted from --color-vihrea
}

const SEED = 'markkinavihreat'

// --- deterministic randomness -------------------------------------------------

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Pseudo-random numbers in [0, 1) for one key; same key, same sequence. */
function rngFor(key: string): () => number {
  let a = hash(`${SEED}:${key}`)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- helpers ------------------------------------------------------------------

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const n = (v: number) => Math.round(v * 10) / 10
const attrs = (a: Record<string, string | number>) =>
  Object.entries(a)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? n(v) : v}"`)
    .join(' ')

/** SVG markup for a shape in a given state; shared with the animator. */
export function shapeSvg(
  tag: Shape['tag'],
  num: Record<string, number>,
  str: Record<string, string>,
  inner = '',
): string {
  if (tag === 'g') {
    return `<g transform="translate(${n(num.tx)} ${n(num.ty)}) scale(${Math.round(num.s * 1000) / 1000})">${inner}</g>`
  }
  return `<${tag} ${attrs({ ...num, ...str })}/>`
}

function prim(
  layer: Layer,
  key: string,
  tag: Exclude<Shape['tag'], 'g'>,
  num: Record<string, number>,
  str: Record<string, string>,
  box: Box,
): Shape {
  return { layer, key, tag, num, str, box, svg: shapeSvg(tag, num, str) }
}

/** A group drawn in local coordinates around (0, 0) and placed at (tx, ty). */
function group(layer: Layer, key: string, tx: number, ty: number, inner: string, box: Box): Shape {
  const num = { tx, ty, s: 1 }
  return { layer, key, tag: 'g', num, str: {}, inner, box, svg: shapeSvg('g', num, {}, inner) }
}

/** Size of the tree from its base to the top of its crown, in viewBox units. */
export const treeHeight = (growth: number) => 60 + 240 * clamp01(growth)

/** Number of branch levels: 1 for a seedling, 6 for the full tree. */
export const depthFor = (growth: number) => 1 + Math.floor(clamp01(growth) * 5.5 + 1e-9)

/** How strongly a trait shows: neutral (0.5) at growth 0, the full score at growth 1. */
export const express = (score: number, growth: number) =>
  0.5 + (clamp01(score / 100) - 0.5) * clamp01(growth)

/** Number of fruit: none before the last three stages, then 6, 9, 12. */
export const fruitCount = (growth: number) => {
  const g = Math.round(clamp01(growth) * 10) / 10
  return g < 0.8 ? 0 : Math.round(((g - 0.6) / 0.4) * 12)
}

// --- the tree -----------------------------------------------------------------

interface Segment {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  level: number
}

interface Leaf {
  key: string
  x: number
  y: number
  r: number
  dark: boolean
  tip: boolean
}

/**
 * Grows the branching skeleton in unit coordinates (trunk length 1, base at
 * the origin, up is −y). `wild` is the freedom trait, 0 = pruned, 1 = wild.
 */
function skeleton(depth: number, wild: number) {
  const segments: Segment[] = []
  const leaves: Leaf[] = []
  // A wild tree leans a little to one side; a pruned one stands straight.
  const lean = (rngFor('lean')() - 0.5) * 0.35 * wild
  const spread = lerp(0.36, 0.56, wild) // radians either side
  // Leaves on the last three levels: big dark ones inside, smaller light ones outside.
  const leafFrom = Math.max(1, depth - 3)

  function branch(key: string, x: number, y: number, angle: number, len: number, level: number) {
    const r = rngFor(key)
    // Always draw the same numbers in the same order, whatever the traits.
    const jitterA = r() - 0.5
    const jitterL = r() - 0.5
    const leafSize = r() - 0.5
    const shade = r()
    const x2 = x + Math.sin(angle) * len
    const y2 = y - Math.cos(angle) * len
    segments.push({
      key,
      x1: x,
      y1: y,
      x2,
      y2,
      width: level === 0 ? 0.17 : 0.12 * Math.pow(0.66, level),
      level,
    })

    if (depth === 1) {
      // A seedling: two leaves either side of the tip.
      for (const side of [-1, 1]) {
        leaves.push({
          key: `${key}${side}`,
          x: x2 + side * 0.24,
          y: y2 + 0.02,
          r: 0.24,
          dark: side < 0,
          tip: true,
        })
      }
    } else if (level >= leafFrom) {
      const tip = level === depth - 1
      const inner = depth - 1 - level // 0 for tips, 1–2 further in
      leaves.push({
        key,
        x: x2,
        y: y2,
        r:
          len *
          (tip ? 0.6 : 0.8 + inner * 0.1) *
          (depth <= 3 ? 0.8 : 1) *
          (1 + wild * leafSize * 0.6),
        // Pruned: a dark core under a light outer layer. Wild: mixed.
        dark: lerp(tip ? 0 : 1, shade < 0.45 ? 1 : 0, wild) >= 0.5,
        tip,
      })
    }
    if (level === depth - 1) return

    for (const side of [-1, 1] as const) {
      const child = rngFor(`${key}${side < 0 ? 'L' : 'R'}`)
      const ca = child() - 0.5
      const cl = child() - 0.5
      branch(
        `${key}${side < 0 ? 'L' : 'R'}`,
        x2,
        y2,
        angle + side * spread + wild * (ca * 0.9 + jitterA * 0.3) + lean,
        (level === 0 ? 1 : len) * lerp(0.72, 0.76, wild) * (1 + wild * (cl * 0.5 + jitterL * 0.15)),
        level + 1,
      )
    }
  }

  // A pruned tree is a garden standard: a taller clear trunk under a clipped crown.
  branch('T', 0, 0, lean * 0.5, depth >= 3 ? lerp(1.5, 1, wild) : 1, 0)
  return { segments, leaves }
}

/**
 * Shapes a pruned tree into a garden standard: the crown is clipped into a
 * ball around the top of the trunk, branches are drawn in under it, and the
 * leaves are spread evenly around it. `amount` 0 leaves the natural shape,
 * 1 is fully clipped; in between it blends. Returns the solid crown behind
 * the leaves, or null when there is none. Mutates segments and leaves.
 */
function clip(segments: Segment[], leaves: Leaf[], amount: number) {
  if (amount <= 0) return null
  const trunk = segments[0]
  const x0 = Math.min(...leaves.map((l) => l.x - l.r))
  const x1 = Math.max(...leaves.map((l) => l.x + l.r))
  const radius = ((x1 - x0) / 2) * 0.62
  const cx = trunk.x2
  const cy = trunk.y2 - radius * 0.55
  const pull = (x: number, y: number, k: number) => ({
    x: lerp(x, cx + (x - cx) * k, amount),
    y: lerp(y, cy + (y - cy) * k, amount),
  })

  for (const s of segments) {
    if (s.level === 0) continue
    // First branches stay attached to the top of the trunk.
    const a = s.level === 1 ? { x: s.x1, y: s.y1 } : pull(s.x1, s.y1, 0.42)
    const b = pull(s.x2, s.y2, 0.42)
    Object.assign(s, {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      width: s.level === 1 ? s.width : s.width * (1 - 0.6 * amount),
    })
  }

  // Tips keep their order around the crown but are spaced evenly on its rim;
  // the inner leaves cover the face of the ball in a sunflower spiral.
  const tips = leaves
    .filter((l) => l.tip)
    .sort((p, q) => Math.atan2(p.x - cx, cy - p.y) - Math.atan2(q.x - cx, cy - q.y))
  tips.forEach((l, i) => {
    const a = -Math.PI + ((i + 0.5) / tips.length) * Math.PI * 2
    l.x = lerp(l.x, cx + Math.sin(a) * radius * 0.9, amount)
    l.y = lerp(l.y, cy - Math.cos(a) * radius * 0.9, amount)
    l.r = lerp(l.r, radius * 0.2, amount)
  })
  const inner = leaves.filter((l) => !l.tip)
  inner.forEach((l, i) => {
    const d = Math.sqrt((i + 0.5) / inner.length) * radius * 0.7
    const a = i * 2.39996
    l.x = lerp(l.x, cx + Math.sin(a) * d, amount)
    l.y = lerp(l.y, cy - Math.cos(a) * d, amount)
    l.r = lerp(l.r, radius * 0.24, amount)
  })
  // Flat shading for volume: light where the sun hits (upper left), dark below right.
  if (amount >= 0.5) {
    for (const l of leaves) l.dark = (l.x - cx) * 0.6 - (l.y - cy) * -0.8 > radius * 0.35
  }
  // The solid ball only starts to form once the crown is mostly clipped.
  const solid = Math.max(0, (amount - 0.3) / 0.7)
  return solid > 0 ? { x: cx, y: cy, r: radius * solid } : null
}

function boxOfCircle(x: number, y: number, r: number): Box {
  return { x0: x - r, y0: y - r, x1: x + r, y1: y + r }
}

function boxOfSegment(s: Segment, scale: number): Box {
  const h = (s.width * scale) / 2
  return {
    x0: Math.min(s.x1, s.x2) - h,
    y0: Math.min(s.y1, s.y2) - h,
    x1: Math.max(s.x1, s.x2) + h,
    y1: Math.max(s.y1, s.y2) + h,
  }
}

function treeShapes(input: TreeInput): { shapes: Shape[]; leaves: Leaf[] } {
  const growth = clamp01(input.growth)
  const depth = depthFor(growth)
  const wild = express(input.freedom, growth)
  const { segments, leaves } = skeleton(depth, wild)
  const crown = depth >= 2 ? clip(segments, leaves, clamp01((0.55 - wild) / 0.55)) : null

  // Scale so that the top of the crown sits exactly treeHeight(growth) above the ground.
  let top = 0
  for (const s of segments) top = Math.min(top, s.y2, s.y1)
  for (const l of leaves) top = Math.min(top, l.y - l.r)
  if (crown) top = Math.min(top, crown.y - crown.r)
  const scale = treeHeight(growth) / -top
  const X = (x: number) => VIEW.baseX + x * scale
  const Y = (y: number) => VIEW.groundY + y * scale

  const shapes: Shape[] = []
  const placed: Leaf[] = []
  // Thick to thin, so twigs sit on top of the trunk.
  for (const s of [...segments].sort((a, b) => a.level - b.level)) {
    const seg = { ...s, x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2) }
    shapes.push(
      prim(
        'tree',
        `b:${s.key}`,
        'line',
        { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, 'stroke-width': s.width * scale },
        { stroke: COLORS.ink, 'stroke-linecap': 'round' },
        boxOfSegment(seg, scale),
      ),
    )
  }
  if (crown) {
    const r = crown.r * scale
    const [cx, cy] = [X(crown.x), Y(crown.y)]
    shapes.push(
      prim(
        'tree',
        'crown',
        'circle',
        { cx, cy, r },
        { fill: COLORS.leafDark },
        boxOfCircle(cx, cy, r),
      ),
    )
  }
  // Dark leaves first, light ones on top.
  for (const l of [...leaves].sort((a, b) => Number(b.dark) - Number(a.dark))) {
    const leaf = { ...l, x: X(l.x), y: Y(l.y), r: l.r * scale }
    placed.push(leaf)
    shapes.push(
      prim(
        'tree',
        `l:${l.key}`,
        'circle',
        { cx: leaf.x, cy: leaf.y, r: leaf.r },
        { fill: l.dark ? COLORS.leafDark : COLORS.leaf },
        boxOfCircle(leaf.x, leaf.y, leaf.r),
      ),
    )
  }
  return { shapes, leaves: placed }
}

// --- fruit (markets) ----------------------------------------------------------

/** A euro sign centred on (x, y), `s` = radius of its curve, as one stroked path. */
function euro(x: number, y: number, s: number, color: string, width: number) {
  const d =
    `M${n(x + s * 0.55)} ${n(y - s * 0.8)}A${n(s)} ${n(s)} 0 1 0 ${n(x + s * 0.55)} ${n(y + s * 0.8)}` +
    `M${n(x - s * 1.25)} ${n(y - s * 0.25)}h${n(s * 1.3)}M${n(x - s * 1.25)} ${n(y + s * 0.3)}h${n(s * 1.3)}`
  return `<path ${attrs({ d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' })}/>`
}

/** Share of fruit that turns into money at markets 100; a couple of apples always stay. */
const MAX_MONEY = 0.8

function fruitShapes(input: TreeInput, leaves: Leaf[]): Shape[] {
  const count = fruitCount(input.growth)
  if (count === 0) return []
  const money = express(input.markets, input.growth)
  // Fruit hang from tip leaves, chosen and typed by fixed per-leaf orders, so
  // a higher markets score turns apples into money (coins and banknotes) one
  // at a time.
  const hosts = leaves
    .filter((l) => l.tip)
    .map((l) => ({ l, order: rngFor(`fruit:${l.key}`)() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
  const moneyRanks = hosts
    .map((h, i) => ({ i, order: rngFor(`coin:${h.l.key}`)() }))
    .sort((a, b) => a.order - b.order)
    .map((h) => h.i)
  const moneyCount = Math.round(count * money * MAX_MONEY)

  return hosts.map(({ l }, i) => {
    // Drawn around (0, 0) and placed under the host leaf.
    const fx = l.x
    const fy = l.y + l.r * 0.45
    const x = 0
    const y = 0
    const r = 7.5
    const rank = moneyRanks.indexOf(i)
    let kind: 'apple' | 'coin' | 'bill'
    let parts: string[]
    let reach = r + 3
    if (rank >= moneyCount) {
      kind = 'apple'
      parts = [
        `<circle ${attrs({ cx: x, cy: y, r, fill: COLORS.apple })}/>`,
        `<line ${attrs({ x1: x, y1: y - r + 1, x2: x + 1.5, y2: y - r - 3.5, stroke: COLORS.ink, 'stroke-width': 1.5, 'stroke-linecap': 'round' })}/>`,
        `<ellipse ${attrs({ cx: x + 4.5, cy: y - r - 2, rx: 3.5, ry: 1.8, fill: COLORS.leafDark, transform: `rotate(-25 ${n(x + 4.5)} ${n(y - r - 2)})` })}/>`,
      ]
    } else if (rank % 2 === 1) {
      // A banknote hanging at a slant, like a leaf.
      kind = 'bill'
      const tilt = (rngFor(`bill:${l.key}`)() - 0.5) * 50
      const w = 26
      const h = 14
      const by = y + 2
      const t = `rotate(${n(tilt)} ${n(x)} ${n(by)})`
      parts = [
        `<rect ${attrs({ x: x - w / 2, y: by - h / 2, width: w, height: h, rx: 2, fill: COLORS.bill, stroke: COLORS.leafDark, 'stroke-width': 1.5, transform: t })}/>`,
        `<rect ${attrs({ x: x - w / 2 + 2.5, y: by - h / 2 + 2.5, width: w - 5, height: h - 5, rx: 1, fill: 'none', stroke: COLORS.leafDark, 'stroke-width': 0.8, 'stroke-opacity': 0.6, transform: t })}/>`,
        euro(x + 0.5, by, 3, COLORS.leafDark, 1.4).replace('/>', ` transform="${t}"/>`),
      ]
      reach = w / 2 + 4
    } else {
      kind = 'coin'
      parts = [
        `<circle ${attrs({ cx: x, cy: y, r: r + 0.5, fill: COLORS.coin, stroke: COLORS.ink, 'stroke-width': 1.5 })}/>`,
        `<circle ${attrs({ cx: x, cy: y, r: r - 2, fill: 'none', stroke: COLORS.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.5 })}/>`,
        euro(x + 0.5, y, 3, COLORS.ink, 1.4),
      ]
    }
    return group('fruit', `f:${l.key}:${kind}`, fx, fy, parts.join(''), boxOfCircle(fx, fy, reach))
  })
}

// --- life around the tree (environment) ---------------------------------------

type Item = { svg: string[]; box: Box }

const G = VIEW.groundY

/** The tidy-garden end: mown lawn, path, bench, topiary, lamp, a formal bed. */
function gardenItems(): Item[] {
  const stripes: Item = {
    svg: [-14, -6, 2, 10, 18, 26].map((dy, i) => {
      const y = G + dy
      const half = 215 * Math.sqrt(Math.max(0, 1 - ((y - G - 4) / 30) ** 2))
      return `<rect ${attrs({ x: VIEW.baseX - half, y: y - 2.5, width: half * 2, height: 5, rx: 2.5, fill: i % 2 ? COLORS.leaf : COLORS.leafDark, 'fill-opacity': 0.22 })}/>`
    }),
    box: { x0: 25, y0: G - 17, x1: 455, y1: G + 29 },
  }
  const path: Item = {
    svg: [
      `<path ${attrs({ d: `M${VIEW.baseX + 6} ${G - 2}C${VIEW.baseX + 40} ${G + 6} ${VIEW.baseX + 70} ${G + 18} ${VIEW.baseX + 92} ${G + 34}L${VIEW.baseX + 128} ${G + 34}C${VIEW.baseX + 100} ${G + 16} ${VIEW.baseX + 62} ${G + 4} ${VIEW.baseX + 22} ${G - 2}Z`, fill: COLORS.stone })}/>`,
      ...[0.06, 0.26, 0.48, 0.7, 0.92].map((t) => {
        const x = VIEW.baseX + 18 + t * 92
        const y = G + t * 30
        return `<rect ${attrs({ x: x - 7, y: y - 2.5, width: 14, height: 5, rx: 2.5, fill: COLORS.petal })}/>`
      }),
    ],
    box: { x0: VIEW.baseX, y0: G - 5, x1: VIEW.baseX + 130, y1: G + 36 },
  }
  const bx = 370
  const bench: Item = {
    svg: [
      `<rect ${attrs({ x: bx, y: G - 30, width: 54, height: 7, rx: 3, fill: COLORS.leafDark })}/>`,
      `<rect ${attrs({ x: bx - 2, y: G - 18, width: 58, height: 6, rx: 3, fill: COLORS.leafDark })}/>`,
      `<line ${attrs({ x1: bx + 6, y1: G - 12, x2: bx + 6, y2: G, stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linecap': 'round' })}/>`,
      `<line ${attrs({ x1: bx + 48, y1: G - 12, x2: bx + 48, y2: G, stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linecap': 'round' })}/>`,
    ],
    box: { x0: bx - 2, y0: G - 30, x1: bx + 56, y1: G },
  }
  const topiary = (x: number): Item => ({
    svg: [
      `<path ${attrs({ d: `M${x - 9} ${G - 14}h18l-3 14h-12z`, fill: COLORS.apple })}/>`,
      `<circle ${attrs({ cx: x, cy: G - 26, r: 13, fill: COLORS.leafDark })}/>`,
    ],
    box: { x0: x - 13, y0: G - 39, x1: x + 13, y1: G },
  })
  const lamp: Item = {
    svg: [
      `<line ${attrs({ x1: 446, y1: G - 62, x2: 446, y2: G, stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linecap': 'round' })}/>`,
      `<circle ${attrs({ cx: 446, cy: G - 66, r: 7, fill: COLORS.coin, stroke: COLORS.ink, 'stroke-width': 2 })}/>`,
    ],
    box: { x0: 438, y0: G - 74, x1: 454, y1: G },
  }
  const hedge = (x: number, w: number): Item => ({
    svg: [`<rect ${attrs({ x, y: G - 16, width: w, height: 18, rx: 9, fill: COLORS.leafDark })}/>`],
    box: { x0: x, y0: G - 16, x1: x + w, y1: G + 2 },
  })
  const tulips: Item = {
    svg: [150, 166, 182].flatMap((x) => [
      `<line ${attrs({ x1: x, y1: G - 18, x2: x, y2: G + 2, stroke: COLORS.leafDark, 'stroke-width': 2.5, 'stroke-linecap': 'round' })}/>`,
      `<path ${attrs({ d: `M${x - 5} ${G - 26}l2.5 4 2.5 -4 2.5 4 2.5 -4v6a5 5 0 0 1 -10 0z`, fill: COLORS.apple })}/>`,
    ]),
    box: { x0: 145, y0: G - 26, x1: 187, y1: G + 2 },
  }
  // Order = the order in which items give way as the environment score rises.
  return [
    bench,
    stripes,
    topiary(62),
    tulips,
    path,
    lamp,
    topiary(98),
    hedge(118, 24),
    hedge(14, 28),
  ]
}

/** The wild end: flowers, grass, bees and birds. */
function wildItems(): Item[] {
  const r = rngFor('wild')
  const flower = (x: number, h: number, color: string): Item => {
    const top = G - h
    const petals = [0, 1, 2, 3, 4]
      .map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const px = x + Math.cos(a) * 6.5
        const py = top + Math.sin(a) * 6.5
        return `M${n(px - 5)} ${n(py)}a5 5 0 1 0 10 0a5 5 0 1 0 -10 0`
      })
      .join('')
    return {
      svg: [
        `<path ${attrs({ d: `M${x} ${G + 2}q${n((r() - 0.5) * 10)} -${n(h / 2)} 0 -${n(h)}`, fill: 'none', stroke: COLORS.leafDark, 'stroke-width': 2.5, 'stroke-linecap': 'round' })}/>`,
        `<path ${attrs({ d: petals, fill: color })}/>`,
        `<circle ${attrs({ cx: x, cy: top, r: 4.5, fill: color === COLORS.coin ? COLORS.apple : COLORS.coin })}/>`,
      ],
      box: { x0: x - 12, y0: top - 12, x1: x + 12, y1: G + 2 },
    }
  }
  const grass = (x: number): Item => ({
    svg: [
      `<path ${attrs({ d: `M${x - 8} ${G + 2}q2 -10 -4 -18M${x} ${G + 2}q0 -12 3 -22M${x + 8} ${G + 2}q-1 -9 6 -15`, fill: 'none', stroke: COLORS.leafDark, 'stroke-width': 2.5, 'stroke-linecap': 'round' })}/>`,
    ],
    box: { x0: x - 12, y0: G - 20, x1: x + 14, y1: G + 2 },
  })
  // A bee buzzes its wing and wanders slowly back and forth over the
  // flowers; `delay` (s) sets where in its round it starts.
  const bee = (x: number, y: number, delay: number): Item => ({
    svg: [
      `<g class="qt-fly" style="animation-delay:-${delay}s">`,
      `<g class="qt-buzz"><ellipse ${attrs({ cx: x - 1, cy: y - 6, rx: 4.5, ry: 6, fill: COLORS.petal, 'fill-opacity': 0.9, stroke: COLORS.ink, 'stroke-width': 1, transform: `rotate(-30 ${n(x - 1)} ${n(y - 6)})` })}/></g>`,
      `<ellipse ${attrs({ cx: x, cy: y, rx: 8, ry: 5.5, fill: COLORS.coin, stroke: COLORS.ink, 'stroke-width': 1.5 })}/>`,
      `<path ${attrs({ d: `M${x - 1.5} ${y - 5}v10M${x + 3} ${y - 4.5}v9`, stroke: COLORS.ink, 'stroke-width': 1.8 })}/>`,
      '</g>',
    ],
    box: { x0: x - 9, y0: y - 13, x1: x + 9, y1: y + 6 },
  })
  // Idle motion (wing beats, gliding) comes from TREE_STYLE; each animal gets
  // its own phase so they don't move in step.
  const phase = (x: number) => `animation-delay:-${n((x % 9) / 10)}s`
  // Two wings hinged at the body, so they can beat up and down from the shoulders.
  const bird = (x: number, y: number, s: number): Item => {
    const wing = (side: -1 | 1) =>
      `<path class="${side < 0 ? 'qt-wl' : 'qt-wr'}" style="${phase(x * 3)}" ${attrs({ d: `M${x} ${y}q${n(side * 4 * s)} -${n(7 * s)} ${n(side * 11 * s)} -${n(3 * s)}`, fill: 'none', stroke: COLORS.ink, 'stroke-width': 2.5, 'stroke-linecap': 'round' })}/>`
    return {
      svg: [`<g class="qt-glide" style="${phase(x)}">`, wing(-1), wing(1), '</g>'],
      box: { x0: x - 12 * s, y0: y - 9 * s, x1: x + 12 * s, y1: y + 2 * s },
    }
  }
  const butterfly = (x: number, y: number): Item => ({
    svg: [
      `<g class="qt-bob" style="${phase(x)}">`,
      `<path class="qt-wing-l" style="${phase(x * 7)}" ${attrs({ d: `M${x} ${y}c-9 -10 -14 -2 -9 4c-6 4 -2 10 9 -4z`, fill: COLORS.apple })}/>`,
      `<path class="qt-wing-r" style="${phase(x * 7)}" ${attrs({ d: `M${x} ${y}c9 -10 14 -2 9 4c6 4 2 10 -9 -4z`, fill: COLORS.coin })}/>`,
      '</g>',
    ],
    box: { x0: x - 12, y0: y - 10, x1: x + 12, y1: y + 8 },
  })
  return [
    flower(392, 46, COLORS.petal),
    bird(418, 64, 1.4),
    grass(66),
    flower(150, 36, COLORS.coin),
    bee(414, 290, 0),
    flower(424, 26, COLORS.apple),
    butterfly(112, 280),
    flower(96, 50, COLORS.petal),
    bird(58, 92, 1.2),
    grass(334),
    flower(176, 22, COLORS.apple),
    bee(124, 300, 5),
    flower(364, 24, COLORS.coin),
    butterfly(452, 250),
    flower(42, 26, COLORS.coin),
    bird(446, 116, 1),
    grass(458),
    grass(196),
  ]
}

function lifeShapes(input: TreeInput): Shape[] {
  const wild = express(input.environment, input.growth)
  const garden = gardenItems()
  const nature = wildItems()
  const keepGarden = Math.round(garden.length * (1 - wild))
  const keepWild = Math.round(nature.length * wild)
  // Each item is one group, anchored at the middle of its base, so it can
  // grow out of the ground when it appears.
  const toShapes = (layer: Layer, prefix: string, items: Item[]) =>
    items.map((item, i) => {
      const px = n((item.box.x0 + item.box.x1) / 2)
      const py = n(item.box.y1)
      const inner = `<g transform="translate(${-px} ${-py})">${item.svg.join('')}</g>`
      return group(layer, `${prefix}:${i}`, px, py, inner, item.box)
    })
  return [
    ...toShapes('garden', 'g', garden.slice(0, keepGarden)),
    ...toShapes('wild', 'w', nature.slice(0, keepWild)),
  ]
}

// --- assembly -----------------------------------------------------------------

export function treeShapesFor(input: TreeInput): Shape[] {
  const ground = prim(
    'ground',
    'ground',
    'ellipse',
    { cx: VIEW.baseX, cy: G + 6, rx: 228, ry: 34 },
    { fill: COLORS.leaf, 'fill-opacity': '0.28' },
    { x0: VIEW.baseX - 228, y0: G - 28, x1: VIEW.baseX + 228, y1: G + 40 },
  )
  const { shapes: tree, leaves } = treeShapes(input)
  const life = lifeShapes(input)
  // Flat ground-level items go behind the tree, upright ones in front.
  const behind = life.filter((s) => s.box.y0 > G - 20)
  const front = life.filter((s) => s.box.y0 <= G - 20)
  const shapes = [ground, ...behind, ...tree, ...fruitShapes(input, leaves), ...front]
  const style = input.style ?? DEFAULT_STYLE
  return style === 'line' ? lineArt(shapes) : style === 'paper' ? paperCut(shapes) : shapes
}

// --- alternative styles -------------------------------------------------------

/**
 * Re-colours the primitives inside a group's markup. `paint` gets each
 * primitive's attributes and returns the replacement attribute text.
 */
function repaint(markup: string, paint: (attrs: string) => string): string {
  return markup.replace(
    /<(circle|ellipse|rect|path|line)\b([^>]*?)\/>/g,
    (_, tag: string, a: string) => `<${tag}${paint(a)}/>`,
  )
}

const getAttr = (a: string, name: string) => new RegExp(` ${name}="([^"]*)"`).exec(a)?.[1]
const setAttr = (a: string, name: string, value: string) =>
  getAttr(a, name) !== undefined
    ? a.replace(new RegExp(` ${name}="[^"]*"`), ` ${name}="${value}"`)
    : `${a} ${name}="${value}"`
const dropAttr = (a: string, name: string) => a.replace(new RegExp(` ${name}="[^"]*"`), '')

/** A copy of a shape under a new key, with replaced numbers and colours. */
function variant(
  shape: Shape,
  key: string,
  num: Record<string, number>,
  str: Record<string, string>,
  inner = shape.inner,
): Shape {
  return { ...shape, key, num, str, inner, svg: shapeSvg(shape.tag, num, str, inner) }
}

const LINE = {
  ink: '#1A3A1A', // --color-metsa
  paper: '#FFFFFF',
  width: 2.2,
  // Colour stays only where it carries meaning: fruit, money, flowers, insects.
  fill: {
    [COLORS.apple]: COLORS.apple,
    [COLORS.coin]: COLORS.coin,
    [COLORS.bill]: '#E8F3DA',
  } as Record<string, string>,
}

/**
 * Style B: every shape is white with one even outline. The trunk, branches
 * and crown are outlined as one silhouette: all their outlines are drawn
 * first (keys prefixed `o~`), then all their white fills on top.
 */
function lineArt(shapes: Shape[]): Shape[] {
  const fillOf = (c: string) => LINE.fill[c] ?? LINE.paper
  const paintLine = (a: string, width = LINE.width) => {
    const fill = getAttr(a, 'fill')
    const faint = Number(getAttr(a, 'fill-opacity') ?? 1) < 0.5
    let out = dropAttr(dropAttr(a, 'fill-opacity'), 'stroke-opacity')
    if (faint) {
      // Lawn stripes and the like: a light pencil line.
      out = setAttr(
        setAttr(setAttr(out, 'fill', 'none'), 'stroke', LINE.ink),
        'stroke-opacity',
        '0.3',
      )
      return setAttr(out, 'stroke-width', '1.2')
    }
    if (fill && fill !== 'none') out = setAttr(out, 'fill', fillOf(fill))
    out = setAttr(out, 'stroke', LINE.ink)
    out = setAttr(out, 'stroke-width', String(width))
    return setAttr(out, 'stroke-linejoin', 'round')
  }

  const tree = shapes.filter((x) => x.layer === 'tree')
  const outlines = tree.map((x) =>
    x.tag === 'line'
      ? variant(
          x,
          `o~${x.key}`,
          { ...x.num, 'stroke-width': x.num['stroke-width'] + LINE.width * 2 },
          { ...x.str, stroke: LINE.ink },
        )
      : variant(x, `o~${x.key}`, { ...x.num, r: x.num.r + LINE.width }, { fill: LINE.ink }),
  )
  const fills = tree.map((x) =>
    x.tag === 'line'
      ? variant(x, x.key, x.num, { ...x.str, stroke: LINE.paper })
      : // A faint pencil line inside the crown hints at the leaf clusters.
        variant(x, x.key, x.num, {
          fill: LINE.paper,
          stroke: LINE.ink,
          'stroke-width': '1',
          'stroke-opacity': '0.28',
        }),
  )
  const outlineBranches = outlines.filter((x) => x.tag === 'line')
  const outlineCrown = outlines.filter((x) => x.tag !== 'line')
  const fillBranches = fills.filter((x) => x.tag === 'line')
  const fillCrown = fills.filter((x) => x.tag !== 'line')

  const other = (x: Shape): Shape => {
    // Fruit are small, so their details get a finer line to stay readable.
    const width = x.layer === 'fruit' ? 1.3 : LINE.width
    if (x.tag === 'g')
      return variant(
        x,
        x.key,
        x.num,
        {},
        repaint(x.inner ?? '', (a) => paintLine(a, width)),
      )
    // The ground: a white mound with an outline.
    return variant(x, x.key, x.num, {
      fill: LINE.paper,
      stroke: LINE.ink,
      'stroke-width': String(LINE.width),
    })
  }
  const firstTree = shapes.findIndex((x) => x.layer === 'tree')
  const before = shapes.slice(0, firstTree).map(other)
  const after = shapes.filter((x, i) => i > firstTree && x.layer !== 'tree').map(other)
  return [...before, ...outlineBranches, ...fillBranches, ...outlineCrown, ...fillCrown, ...after]
}

const PAPER: Record<string, string> = {
  [COLORS.leaf]: '#7FB548',
  [COLORS.leafDark]: '#356F2B',
  [COLORS.coin]: '#F2C14E',
  [COLORS.ink]: '#6B4F3A', // a brown-paper trunk
  [COLORS.apple]: '#DD6B4A',
  [COLORS.stone]: '#EFE7D6',
  [COLORS.petal]: '#FFFDF6',
  [COLORS.bill]: '#E4F1D3',
}
const EDGE = { color: '#1A3A1A', opacity: '0.2', dx: 2.5, dy: 3.5 }

/**
 * Style C: paper-cut layers. Soft paper colours; every piece sits on a flat,
 * offset paper edge (keys prefixed `s~`), and the ground is three stacked
 * hills. The tree's edges are drawn together first, so the whole tree casts
 * one clean edge.
 */
function paperCut(shapes: Shape[]): Shape[] {
  const colour = (c: string) => PAPER[c] ?? c
  const paintPaper = (a: string) => {
    let out = a
    const fill = getAttr(a, 'fill')
    const stroke = getAttr(a, 'stroke')
    if (fill && fill !== 'none') out = setAttr(out, 'fill', colour(fill))
    if (stroke) out = setAttr(out, 'stroke', colour(stroke))
    return out
  }
  const paintEdge = (a: string) => {
    let out = a
    if (getAttr(a, 'fill') && getAttr(a, 'fill') !== 'none') out = setAttr(out, 'fill', EDGE.color)
    if (getAttr(a, 'stroke')) out = setAttr(out, 'stroke', EDGE.color)
    return dropAttr(dropAttr(out, 'fill-opacity'), 'stroke-opacity')
  }
  const shift = (x: Shape): Record<string, number> => {
    const m = { ...x.num }
    if (x.tag === 'line')
      Object.assign(m, {
        x1: m.x1 + EDGE.dx,
        y1: m.y1 + EDGE.dy,
        x2: m.x2 + EDGE.dx,
        y2: m.y2 + EDGE.dy,
      })
    else if (x.tag === 'g') Object.assign(m, { tx: m.tx + EDGE.dx, ty: m.ty + EDGE.dy })
    else Object.assign(m, { cx: m.cx + EDGE.dx, cy: m.cy + EDGE.dy })
    return m
  }
  const edgeOf = (x: Shape): Shape =>
    x.tag === 'g'
      ? variant(
          x,
          `s~${x.key}`,
          shift(x),
          {},
          `<g opacity="${EDGE.opacity}">${repaint(x.inner ?? '', paintEdge)}</g>`,
        )
      : variant(
          x,
          `s~${x.key}`,
          shift(x),
          x.tag === 'line'
            ? { ...x.str, stroke: EDGE.color, 'stroke-opacity': EDGE.opacity }
            : { fill: EDGE.color, 'fill-opacity': EDGE.opacity },
        )
  const painted = (x: Shape): Shape =>
    x.tag === 'g'
      ? variant(x, x.key, x.num, {}, repaint(x.inner ?? '', paintPaper))
      : variant(
          x,
          x.key,
          x.num,
          Object.fromEntries(Object.entries(x.str).map(([k, v]) => [k, colour(v)])),
        )

  const out: Shape[] = []
  const tree = shapes.filter((x) => x.layer === 'tree')
  for (const x of shapes) {
    if (x.layer === 'ground') {
      // Three stacked hills instead of one flat lawn.
      const { cx, cy, rx, ry } = x.num
      const hills: [string, number, number, number, string][] = [
        ['ground', 0, 0, 1, '#C6DFA2'],
        ['ground~2', -60, 8, 0.62, '#AFD486'],
        ['ground~3', 90, 14, 0.5, '#9CC872'],
      ]
      for (const [key, dx, dy, k, fill] of hills) {
        const num = { cx: cx + dx, cy: cy + dy, rx: rx * k, ry: ry * (0.5 + k / 2) }
        out.push(
          variant(
            x,
            `s~${key}`,
            { ...num, cx: num.cx + EDGE.dx, cy: num.cy + EDGE.dy },
            { fill: EDGE.color, 'fill-opacity': EDGE.opacity },
          ),
        )
        out.push(variant(x, key, num, { fill }))
      }
    } else if (x.layer === 'tree') {
      if (x === tree[0]) out.push(...tree.map(edgeOf), ...tree.map(painted))
    } else {
      out.push(edgeOf(x), painted(x))
    }
  }
  return out
}

/**
 * Idle motion for the animals: butterflies flap and drift, birds beat their
 * wings and glide. Pure CSS inside the SVG; off with prefers-reduced-motion,
 * and simply ignored by static renderers (link-preview images).
 */
export const TREE_STYLE =
  '<style>' +
  '.qt-wing-l,.qt-wing-r,.qt-wl,.qt-wr,.qt-buzz,.qt-fly{transform-box:fill-box}' +
  // Bees: a fast wing buzz, and a slow wavy flight to one side and back,
  // turning around at each end.
  '.qt-buzz{transform-origin:50% 100%;animation:qt-buzz .07s linear infinite alternate}' +
  '@keyframes qt-buzz{to{transform:scaleY(.5)}}' +
  '.qt-fly{transform-origin:50% 50%;animation:qt-fly 10s ease-in-out infinite}' +
  '@keyframes qt-fly{' +
  '0%{transform:translate(0,0) scaleX(1)}' +
  '12%{transform:translate(-14px,-7px) scaleX(1)}' +
  '25%{transform:translate(-28px,0) scaleX(1)}' +
  '37%{transform:translate(-42px,-7px) scaleX(1)}' +
  '46%{transform:translate(-52px,-2px) scaleX(1)}' +
  '50%{transform:translate(-54px,0) scaleX(-1)}' +
  '62%{transform:translate(-40px,-7px) scaleX(-1)}' +
  '75%{transform:translate(-26px,0) scaleX(-1)}' +
  '87%{transform:translate(-12px,-7px) scaleX(-1)}' +
  '96%{transform:translate(-2px,-2px) scaleX(-1)}' +
  '100%{transform:translate(0,0) scaleX(1)}}' +
  // Butterflies: wings fold in and out at the body; the whole butterfly drifts.
  '.qt-wing-l{transform-origin:100% 50%;animation:qt-flap .55s ease-in-out infinite alternate}' +
  '.qt-wing-r{transform-origin:0 50%;animation:qt-flap .55s ease-in-out infinite alternate}' +
  '@keyframes qt-flap{to{transform:scaleX(.25)}}' +
  '.qt-bob{animation:qt-bob 3.8s ease-in-out infinite alternate}' +
  '@keyframes qt-bob{to{transform:translate(6px,-8px)}}' +
  // Birds: two wing beats from the shoulders, then a glide with wings held out.
  '.qt-wl{transform-origin:100% 100%;animation:qt-wl 2.6s ease-in-out infinite}' +
  '.qt-wr{transform-origin:0 100%;animation:qt-wr 2.6s ease-in-out infinite}' +
  '@keyframes qt-wl{0%,30%,60%,100%{transform:rotate(10deg)}15%,45%{transform:rotate(-35deg)}}' +
  '@keyframes qt-wr{0%,30%,60%,100%{transform:rotate(-10deg)}15%,45%{transform:rotate(35deg)}}' +
  '.qt-glide{animation:qt-glide 5s ease-in-out infinite alternate}' +
  '@keyframes qt-glide{to{transform:translate(-10px,4px)}}' +
  '@media (prefers-reduced-motion:reduce){.qt-wing-l,.qt-wing-r,.qt-bob,.qt-wl,.qt-wr,.qt-glide,.qt-buzz,.qt-fly{animation:none}}' +
  '</style>'

/** The tree as a standalone SVG string. Same input, same string. */
export function renderTree(input: TreeInput, label = ''): string {
  const body = treeShapesFor(input)
    .map((s) => s.svg)
    .join('')
  const a11y = label
    ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true"'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.width} ${VIEW.height}" ${a11y}>${TREE_STYLE}${body}</svg>`
}
