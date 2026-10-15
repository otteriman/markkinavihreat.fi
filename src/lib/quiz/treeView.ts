/**
 * Animates the generated tree (tree.ts) from one state to the next, keyed by
 * each shape's stable key (plan section 7.3):
 * - shapes in both states glide to their new size and position,
 * - new branches draw out from their parent's tip,
 * - new leaves, fruit and garden or wildlife items grow in from nothing,
 *   with a slight stagger,
 * - shapes that are no longer there shrink away.
 * With prefers-reduced-motion every change is instant.
 */
import { shapeSvg, treeShapesFor, VIEW, type Shape, type TreeInput } from './tree'

const SVGNS = 'http://www.w3.org/2000/svg'
export const DURATION = 600 // ms, the plan's maximum per stage

/** What is on screen for one key at one moment. */
export interface Frame {
  tag: Shape['tag']
  num: Record<string, number>
  str: Record<string, string>
  inner?: string
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function hash01(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

const toFrame = (s: Shape): Frame => ({
  tag: s.tag,
  num: { ...s.num },
  str: { ...s.str },
  inner: s.inner,
})

/** The "not there yet" version of a shape, which it grows out of (or shrinks into). */
export function seedOf(shape: Frame, parent?: Frame): Frame {
  const num = { ...shape.num }
  if (shape.tag === 'line') {
    // A branch starts as a point at its parent's tip.
    const x = parent?.num.x2 ?? num.x1
    const y = parent?.num.y2 ?? num.y1
    Object.assign(num, { x1: x, y1: y, x2: x, y2: y })
  } else if (shape.tag === 'circle') num.r = 0
  else if (shape.tag === 'ellipse') Object.assign(num, { rx: 0, ry: 0 })
  else num.s = 0
  return { ...shape, num }
}

/**
 * When a shape starts and how long it takes, as fractions of the whole
 * transition: existing shapes move at once, new branches first, then leaves,
 * then fruit; leaving shapes shrink early.
 */
export function timing(key: string, change: 'stay' | 'enter' | 'leave'): [number, number] {
  const r = hash01(key)
  if (change === 'stay') return [0, 1]
  if (change === 'leave') return [r * 0.2, 0.5]
  if (key.startsWith('b:')) return [Math.min(0.3, (key.length - 3) * 0.04), 0.55]
  if (key.startsWith('l:') || key === 'crown') return [0.3 + r * 0.3, 0.4]
  if (key.startsWith('f:')) return [0.5 + r * 0.25, 0.25]
  return [0.15 + r * 0.45, 0.4]
}

/** One shape's state at progress `p` (0–1, already eased) between two frames. */
export function blend(from: Frame, to: Frame, p: number): Frame {
  const num: Record<string, number> = {}
  for (const k of Object.keys(to.num)) num[k] = lerp(from.num[k] ?? to.num[k], to.num[k], p)
  return { tag: to.tag, num, str: p < 0.5 ? from.str : to.str, inner: to.inner }
}

/** Parent branch key for a branch key: b:TLR → b:TL. */
const parentKey = (key: string) =>
  key.startsWith('b:') && key.length > 3 ? key.slice(0, -1) : null

function setAttrs(el: SVGElement, f: Frame) {
  if (f.tag === 'g') {
    const s = Math.round(f.num.s * 1000) / 1000
    el.setAttribute(
      'transform',
      `translate(${f.num.tx.toFixed(1)} ${f.num.ty.toFixed(1)}) scale(${s})`,
    )
    return
  }
  for (const [k, v] of Object.entries(f.num)) el.setAttribute(k, v.toFixed(1))
  for (const [k, v] of Object.entries(f.str)) el.setAttribute(k, v)
}

export class TreeView {
  readonly svg: SVGSVGElement
  private readonly els = new Map<string, SVGElement>()
  /** What is on screen right now, per key (mid-transition values included). */
  private readonly shown = new Map<string, Frame>()
  private run = 0

  constructor(container: HTMLElement, input: TreeInput, label = '') {
    container.innerHTML = `<svg xmlns="${SVGNS}" viewBox="0 0 ${VIEW.width} ${VIEW.height}" ${
      label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'
    }></svg>`
    this.svg = container.querySelector('svg')!
    void this.set(input, false)
  }

  private element(key: string, f: Frame): SVGElement {
    let el = this.els.get(key)
    if (!el) {
      el = document.createElementNS(SVGNS, f.tag) as SVGElement
      if (f.inner) el.innerHTML = f.inner
      this.els.set(key, el)
    }
    return el
  }

  /** Moves to a new state; resolves when the transition has finished. */
  set(input: TreeInput, animate = true): Promise<void> {
    const run = ++this.run
    const next = treeShapesFor(input)
    const nextKeys = new Set(next.map((s) => s.key))
    const leaving = [...this.shown.keys()].filter((k) => !nextKeys.has(k))
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

    // Put elements in the new drawing order; leaving ones stay behind them.
    for (const shape of next) this.svg.appendChild(this.element(shape.key, toFrame(shape)))

    const finish = () => {
      for (const k of leaving) {
        this.els.get(k)?.remove()
        this.els.delete(k)
        this.shown.delete(k)
      }
      for (const shape of next) {
        const f = toFrame(shape)
        setAttrs(this.els.get(shape.key)!, f)
        this.shown.set(shape.key, f)
      }
    }
    if (!animate || reduce || this.shown.size === 0) {
      finish()
      return Promise.resolve()
    }

    // Start and end frames for every key involved.
    const plans = new Map<
      string,
      { from: Frame; to: Frame; at: [number, number]; grows: boolean }
    >()
    for (const shape of next) {
      const to = toFrame(shape)
      const now = this.shown.get(shape.key)
      plans.set(shape.key, {
        from: now ?? seedOf(to),
        to,
        at: timing(shape.key, now ? 'stay' : 'enter'),
        grows: !now,
      })
    }
    for (const k of leaving) {
      const now = this.shown.get(k)!
      plans.set(k, { from: now, to: seedOf(now), at: timing(k, 'leave'), grows: false })
    }

    return new Promise((resolve) => {
      const start = performance.now()
      const step = (time: number) => {
        if (run !== this.run) return resolve() // a newer set() took over
        const t = clamp01((time - start) / DURATION)
        for (const [key, plan] of plans) {
          const p = easeOut(clamp01((t - plan.at[0]) / plan.at[1]))
          let frame = blend(plan.from, plan.to, p)
          // A new branch grows from wherever its parent's tip is right now.
          const parent = parentKey(key)
          if (plan.grows && plan.to.tag === 'line' && parent && this.shown.has(parent)) {
            const tip = this.shown.get(parent)!.num
            const dx = plan.to.num.x2 - plan.to.num.x1
            const dy = plan.to.num.y2 - plan.to.num.y1
            frame = {
              ...frame,
              num: {
                ...frame.num,
                x1: tip.x2,
                y1: tip.y2,
                x2: tip.x2 + dx * p,
                y2: tip.y2 + dy * p,
              },
            }
          }
          setAttrs(this.els.get(key)!, frame)
          this.shown.set(key, frame)
        }
        if (t < 1) requestAnimationFrame(step)
        else {
          finish()
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }
}

/** Markup of a frame, for tests and server rendering. */
export const frameSvg = (f: Frame) => shapeSvg(f.tag, f.num, f.str, f.inner)
