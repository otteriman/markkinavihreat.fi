/** A random number in [0, 1), like Math.random. Injected so battles can be replayed. */
export type Rng = () => number

/** Seeded generator (mulberry32): the same seed always gives the same battle. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Index of an item picked with probability proportional to its weight. */
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return Math.floor(rng() * weights.length)
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}
