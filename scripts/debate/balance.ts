import { DifficultyError, resolveDifficulty } from '../../src/lib/debate/difficulty'
import { checkGuardrail, simulate, STRATEGIES } from '../../src/lib/debate/simulate'
import type { StrategyName } from '../../src/lib/debate/types'
import { loadDebate } from './load'

/**
 * npm run debate:balance [-- --difficulty hard] [--set player.damage.medium=0.4] [--runs 20000]
 *
 * Plays thousands of simulated battles per play style and prints the outcome,
 * so a difficulty change can be judged before anyone plays it. `--set` tries a
 * value without editing config.json (repeatable). Exits 1 if a guardrail from
 * config.json is broken.
 */
const args = process.argv.slice(2)
const option = (name: string) => {
  const values: string[] = []
  args.forEach((arg, i) => {
    if (arg === `--${name}` && args[i + 1]) values.push(args[i + 1])
    else if (arg.startsWith(`--${name}=`)) values.push(arg.slice(name.length + 3))
  })
  return values
}

const { config, enemies } = loadDebate()
const name = option('difficulty')[0] ?? config.difficulty
const runs = Number(option('runs')[0] ?? 20_000)
const seed = Number(option('seed')[0] ?? 1)
const overrides = Object.fromEntries(
  option('set').map((pair) => {
    const [path, value] = pair.split('=')
    if (value === undefined || Number.isNaN(Number(value))) {
      console.error(`--set needs path=number, e.g. --set player.damage.medium=0.4 (got "${pair}")`)
      process.exit(1)
    }
    return [path, Number(value)]
  }),
)

let difficulty
try {
  difficulty = resolveDifficulty(config, name, overrides)
} catch (error) {
  if (!(error instanceof DifficultyError)) throw error
  console.error(error.message)
  process.exit(1)
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(7)
const num = (x: number) => x.toFixed(1).padStart(7)
const rails = Object.keys(overrides).length === 0 ? (config.guardrails[name] ?? {}) : {}
const shown = Object.entries(overrides).map(([k, v]) => `${k}=${v}`)

console.log(
  `Difficulty "${name}"${shown.length ? ` with ${shown.join(', ')}` : ''}` +
    `${name === config.difficulty ? ' (shipped)' : ''}, ${runs} battles per play style\n`,
)
let breaches = 0
for (const enemy of enemies) {
  console.log(`${enemy.id}`)
  console.log(
    `  ${'play style'.padEnd(48)}${'win'.padStart(7)}${'tie'.padStart(7)}${'lose'.padStart(7)}` +
      `${'KO'.padStart(7)}${'player'.padStart(7)}${'enemy'.padStart(7)}${'rounds'.padStart(7)}`,
  )
  for (const [key, { label, strategy }] of Object.entries(STRATEGIES)) {
    const s = simulate(enemy, difficulty, config.rules.playerAttackSlots, strategy, { runs, seed })
    const rail = rails[key as StrategyName]
    const problems = rail ? checkGuardrail(key as StrategyName, s, rail) : []
    breaches += problems.length
    const mark = rail ? (problems.length ? '  ✗' : '  ✓') : ''
    console.log(
      `  ${label.padEnd(48)}${pct(s.winRate)}${pct(s.tieRate)}${pct(s.loseRate)}${pct(s.koRate)}` +
        `${num(s.avgPlayer)}${num(s.avgEnemy)}${num(s.avgRounds)}${mark}`,
    )
    problems.forEach((p) => console.log(`      ${p}`))
  }
  console.log()
}
console.log(
  'player / enemy = average KANNATUS at the end, rounds = average battle length. ' +
    '✓ / ✗ = guardrail from config.json.',
)
if (Object.keys(overrides).length > 0) console.log('Guardrails are not checked with --set.')
if (breaches > 0) process.exit(1)
