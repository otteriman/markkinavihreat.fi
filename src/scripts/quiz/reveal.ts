import type { QuizResult } from '../../lib/quiz/scoring'
import type { TreeView } from '../../lib/quiz/treeView'
import { AXES } from '../../lib/quiz/types'

export interface RevealParts {
  /** The reveal screen: holds [data-reveal-percent], [data-reveal-type], bars and status. */
  section: HTMLElement
  /** The tree's wrapper, which grows and shakes. */
  treeWrap: HTMLElement
  view: TreeView
  /** "{percent} % markkinavihreä" */
  overall: string
  /** Screen-reader summary, "{percent}" and "{type}" filled in. */
  status: string
  typeName: string
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function countUp(el: HTMLElement, template: string, to: number, ms: number) {
  return new Promise<void>((resolve) => {
    const start = performance.now()
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      el.textContent = template.replace('{percent}', String(Math.round(to * easeOut(t))))
      if (t < 1) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
}

/**
 * The result reveal (plan section 7.3): a drum roll (the tree shakes), the
 * final tree, the overall percentage counting up, the three axis bars filling
 * one after another, and the type name fading in. With reduced motion every
 * step is instant.
 */
export async function runReveal(parts: RevealParts, result: QuizResult, reduce: boolean) {
  const { section, treeWrap, view } = parts
  const percent = section.querySelector<HTMLElement>('[data-reveal-percent]')!
  const type = section.querySelector<HTMLElement>('[data-reveal-type]')!
  const status = section.querySelector<HTMLElement>('[data-reveal-status]')
  const drumroll = section.querySelector<HTMLElement>('[data-reveal-drumroll]')
  const fill = (axis: string) =>
    section.querySelector<HTMLElement>(`[data-bars="reveal"] [data-bar="${axis}"]`)!
  const showType = (on: boolean) => {
    type.classList.toggle('opacity-0', !on)
    type.classList.toggle('opacity-100', on)
    drumroll?.classList.toggle('invisible', on)
  }

  // Start from a blank reveal (the lab replays it).
  percent.textContent = parts.overall.replace('{percent}', '0')
  type.textContent = parts.typeName
  showType(false)
  for (const axis of AXES) {
    fill(axis).querySelector<HTMLElement>('[data-bar-fill]')!.style.width = '0%'
    fill(axis).querySelector('[data-bar-value]')!.textContent = ''
  }
  const finalTree = { growth: 1, ...result.scores }
  treeWrap.classList.add('is-reveal')

  const setBar = (axis: (typeof AXES)[number]) => {
    fill(axis).querySelector<HTMLElement>('[data-bar-fill]')!.style.width =
      `${result.scores[axis]}%`
    fill(axis).querySelector('[data-bar-value]')!.textContent = String(result.scores[axis])
  }

  if (reduce) {
    await view.set(finalTree, false)
    percent.textContent = parts.overall.replace('{percent}', String(result.overall))
    AXES.forEach(setBar)
    showType(true)
  } else {
    treeWrap.classList.add('is-shaking')
    await wait(800)
    treeWrap.classList.remove('is-shaking')
    await view.set(finalTree)
    await countUp(percent, parts.overall, result.overall, 1200)
    for (const axis of AXES) {
      setBar(axis)
      await wait(300)
    }
    showType(true)
    await wait(500)
  }
  if (status) {
    status.textContent = parts.status
      .replace('{percent}', String(result.overall))
      .replace('{type}', parts.typeName)
  }
}
