/** Fraction of the card width that makes a swipe count as a long one (±2). */
export const LONG_SWIPE = 0.4
/** Below this fraction the card just snaps back without answering. */
export const MIN_SWIPE = 0.15

/**
 * Answer value for a horizontal swipe of `dx` pixels on a card `width` pixels
 * wide: right = agree, left = disagree, short = ±1, long = ±2, tiny = null.
 */
export function swipeValue(dx: number, width: number): -2 | -1 | 1 | 2 | null {
  if (width <= 0) return null
  const ratio = Math.abs(dx) / width
  if (ratio < MIN_SWIPE) return null
  const sign = dx > 0 ? 1 : -1
  return (ratio >= LONG_SWIPE ? 2 * sign : sign) as -2 | -1 | 1 | 2
}
