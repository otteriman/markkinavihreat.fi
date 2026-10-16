import type { StageBox, StageText } from '../../lib/debate/stageTexts'

/**
 * /debate-lab/ fit check: puts every battle text, in every language, into an
 * off-screen 1× stage per candidate font and reports the ones that overflow
 * their box (speech boxes by height, grid labels and status names by width).
 */
const FAMILIES = ['Debate Pixelify', 'Debate Silkscreen', 'Debate Jersey', 'Debate Micro']
const BOXES: StageBox[] = ['top', 'bottom', 'label', 'status']

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function measure(probe: HTMLElement, item: StageText): boolean {
  const q = <T extends HTMLElement>(sel: string) => probe.querySelector<T>(sel)!
  if (item.box === 'top') {
    q('[data-debate-top]').textContent = item.text
    const box = q('[data-debate-box="top"]')
    return box.scrollHeight <= box.clientHeight
  }
  if (item.box === 'bottom') {
    const text = q('[data-debate-bottom]')
    text.hidden = false
    q('[data-debate-options]').hidden = true
    text.textContent = item.text
    const box = q('[data-debate-box="bottom"]')
    return box.scrollHeight <= box.clientHeight
  }
  if (item.box === 'label') {
    q('[data-debate-bottom]').hidden = true
    q('[data-debate-options]').hidden = false
    // Measured on the label span: a <button> doesn't report its overflow in scrollWidth.
    const button = q('.debate-option')
    const label = q('.debate-option-label')
    label.textContent = item.text
    const room = button.clientWidth - parseFloat(getComputedStyle(button).paddingLeft)
    return label.getBoundingClientRect().width <= room
  }
  const name = q('.debate-status-player .debate-status-name')
  name.textContent = item.text
  return name.scrollWidth <= name.clientWidth
}

export async function runFitCheck(): Promise<void> {
  const report = document.getElementById('fit-report')
  const data = document.getElementById('debate-lab-texts')
  if (!report || !data) return
  const texts = JSON.parse(data.textContent ?? '[]') as StageText[]

  await Promise.all(
    FAMILIES.flatMap((f) => [
      document.fonts.load(`10px "${f}"`),
      document.fonts.load(`bold 10px "${f}"`),
    ]),
  )

  const totals = Object.fromEntries(BOXES.map((b) => [b, texts.filter((t) => t.box === b).length]))
  const rows: string[] = []
  const details: string[] = []
  for (const probe of document.querySelectorAll<HTMLElement>('[data-fit-probe]')) {
    const font = probe.dataset.fitProbe!
    const failures = texts.filter((t) => !measure(probe, t))
    const count = (b: StageBox) => failures.filter((f) => f.box === b).length
    rows.push(
      `<tr data-font="${font}"><td>${font}</td>` +
        BOXES.map((b) => `<td data-box="${b}">${count(b)} / ${totals[b]}</td>`).join('') +
        `<td><strong>${failures.length === 0 ? 'all fit' : `${failures.length} overflow`}</strong></td></tr>`,
    )
    if (failures.length > 0) {
      details.push(
        `<details class="mt-2"><summary>${font}: ${failures.length} text(s)</summary><ul class="mt-1 text-sm">` +
          failures
            .map(
              (f) =>
                `<li><code>${f.box}</code> ${f.locale} (${f.text.length}) ${escape(f.source)}: “${escape(f.text)}”</li>`,
            )
            .join('') +
          '</ul></details>',
      )
    }
  }
  report.innerHTML =
    '<table class="lab-table"><thead><tr><th>Font</th><th>Top box</th><th>Bottom box</th>' +
    '<th>Grid labels</th><th>Status names</th><th></th></tr></thead><tbody>' +
    rows.join('') +
    '</tbody></table>' +
    details.join('')
  report.dataset.done = 'true'
}
