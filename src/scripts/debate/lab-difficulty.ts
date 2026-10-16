import { config, enemies } from '../../lib/debate/data'
import { DifficultyError, resolveDifficulty } from '../../lib/debate/difficulty'
import { checkGuardrail, simulate, STRATEGIES } from '../../lib/debate/simulate'
import type { Difficulty, StrategyName } from '../../lib/debate/types'

/**
 * /debate-lab/ difficulty panel: every knob of a preset as a number input;
 * any change reruns the simulated battles (the same code as
 * `npm run debate:balance`) and shows the command that reproduces it.
 */

/** Dotted paths of every number in a difficulty, e.g. "player.damage.medium". */
function knobs(value: unknown, prefix = ''): [string, number][] {
  if (typeof value === 'number') return [[prefix, value]]
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, v]) => knobs(v, prefix ? `${prefix}.${key}` : key))
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

export function setUpDifficultyPanel(): void {
  const form = document.querySelector<HTMLFormElement>('#difficulty')
  const results = document.getElementById('difficulty-results')
  const command = document.getElementById('difficulty-command')
  if (!form || !results || !command) return
  const preset = form.elements.namedItem('preset') as HTMLSelectElement
  const runsInput = form.elements.namedItem('runs') as HTMLInputElement
  const knobBox = form.querySelector<HTMLElement>('[data-knobs]')!

  const renderKnobs = () => {
    const d = resolveDifficulty(config, preset.value)
    knobBox.innerHTML = knobs(d)
      .map(
        ([path, value]) =>
          `<label class="block"><span class="block text-sm font-semibold">${path}</span>` +
          `<input type="number" step="any" data-knob="${path}" data-preset-value="${value}" ` +
          `value="${value}" class="w-full rounded border px-2 py-1" /></label>`,
      )
      .join('')
  }

  const overrides = () => {
    const out: Record<string, number> = {}
    for (const input of knobBox.querySelectorAll<HTMLInputElement>('[data-knob]')) {
      if (input.value !== '' && Number(input.value) !== Number(input.dataset.presetValue)) {
        out[input.dataset.knob!] = Number(input.value)
      }
    }
    return out
  }

  const run = () => {
    const changed = overrides()
    let difficulty: Difficulty
    try {
      difficulty = resolveDifficulty(config, preset.value, changed)
    } catch (error) {
      if (!(error instanceof DifficultyError)) throw error
      results.innerHTML = `<p class="text-terra font-semibold">${error.message}</p>`
      return
    }
    const runs = Math.max(100, Number(runsInput.value) || 2000)
    const rails = config.guardrails[preset.value] ?? {}
    const tables = enemies.map((enemy) => {
      const rows = Object.entries(STRATEGIES).map(([name, { label, strategy }]) => {
        const s = simulate(enemy, difficulty, config.rules.playerAttackSlots, strategy, { runs })
        const rail = rails[name as StrategyName]
        const breaches = rail ? checkGuardrail(name as StrategyName, s, rail) : []
        const mark = rail ? (breaches.length ? `✗ ${breaches.join('; ')}` : '✓') : ''
        return (
          `<tr data-strategy="${name}"><td>${label}</td><td>${pct(s.winRate)}</td><td>${pct(s.tieRate)}</td>` +
          `<td>${pct(s.loseRate)}</td><td>${pct(s.koRate)}</td><td>${s.avgPlayer.toFixed(1)}</td>` +
          `<td>${s.avgEnemy.toFixed(1)}</td><td>${mark}</td></tr>`
        )
      })
      return (
        `<h3 class="mt-4 font-semibold">${enemy.id}</h3>` +
        '<table class="lab-table mt-2"><thead><tr><th>Play style</th><th>Win</th><th>Tie</th>' +
        '<th>Lose</th><th>KO</th><th>Player</th><th>Enemy</th><th>Guardrail</th></tr></thead><tbody>' +
        rows.join('') +
        '</tbody></table>'
      )
    })
    results.innerHTML =
      tables.join('') +
      '<p class="text-harmaa mt-2 text-sm">Player / Enemy: average KANNATUS at the end. ' +
      `Guardrails are those of "${preset.value}" in config.json.</p>`
    const sets = Object.entries(changed).map(([k, v]) => ` --set ${k}=${v}`)
    command.textContent = `npm run debate:balance -- --difficulty ${preset.value}${sets.join('')}`
  }

  let timer: number | undefined
  const schedule = () => {
    window.clearTimeout(timer)
    results.style.opacity = '0.5'
    timer = window.setTimeout(() => {
      run()
      results.style.opacity = ''
    }, 250)
  }

  preset.addEventListener('change', () => {
    renderKnobs()
    schedule()
  })
  form.addEventListener('input', (event) => {
    if (event.target !== preset) schedule()
  })
  form.querySelector('[data-reset]')?.addEventListener('click', () => {
    renderKnobs()
    schedule()
  })
  form.addEventListener('submit', (event) => event.preventDefault())

  renderKnobs()
  schedule()
}
