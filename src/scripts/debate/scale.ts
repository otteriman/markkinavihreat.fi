/**
 * Zooms each debate stage (240×216 logical pixels) to fit its frame and the
 * viewport. From 2× up the zoom is a whole number, as the spec asks, so pixels
 * stay even. Below 2× (portrait phones) a whole number would leave the game at
 * 1×, too small to read, so it uses the largest eighth that fits instead.
 */
export const STAGE_WIDTH = 240
export const STAGE_HEIGHT = 216

/** Room kept free around the stage when fitting it to the viewport height. */
const VERTICAL_MARGIN = 24

export function stageScale(width: number, height: number): number {
  const fit = Math.min(width / STAGE_WIDTH, (height - VERTICAL_MARGIN) / STAGE_HEIGHT)
  if (fit >= 2) return Math.floor(fit)
  return Math.max(1, Math.floor(fit * 8) / 8)
}

export function fitStages(root: ParentNode): void {
  const frames = [...root.querySelectorAll<HTMLElement>('[data-debate]')].filter(
    (frame) => !frame.dataset.debateFixedScale,
  )
  if (frames.length === 0) return
  const update = () => {
    for (const frame of frames) {
      const stage = frame.querySelector<HTMLElement>('.debate-stage')
      stage?.style.setProperty(
        '--debate-scale',
        String(stageScale(frame.clientWidth, window.innerHeight)),
      )
    }
  }
  update()
  const observer = new ResizeObserver(update)
  frames.forEach((frame) => observer.observe(frame))
  window.addEventListener('resize', update)
}
