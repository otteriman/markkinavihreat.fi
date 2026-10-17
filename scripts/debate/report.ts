import { LOCALES } from '../../src/lib/content'
import { resolveDifficulty } from '../../src/lib/debate/difficulty'
import { expectedDamage, tierOf } from '../../src/lib/debate/simulate'
import type { Localized } from '../../src/lib/debate/types'
import { formatProblem, translationStatus, validateDebate } from '../../src/lib/debate/validate'
import { loadDebate } from './load'

/**
 * npm run debate:report
 *
 * An overview for whoever edits the game's content: every attack with its
 * replies or defenses, each player attack's derived tier and expected damage
 * under the shipped difficulty, the longest texts per language, open
 * translation work, and any content problems (exits 1 if there are some).
 */
const { config, ui, enemies, specials, problems: loadProblems, files } = loadDebate()
const difficulty = resolveDifficulty(config)
const TIER = { vahva: 'Vahva', hyva: 'Hyvä', heikko: 'Heikko' }
const Q = { strong: 'S', medium: 'M', weak: 'W' }

for (const enemy of enemies) {
  console.log(`\n${enemy.id} (${enemy.status.fi})`)
  console.log(
    `\n  Enemy attacks (${enemy.attacks.length}, one per round, reshuffled when all are used)`,
  )
  for (const a of enemy.attacks) {
    const replies = a.replies.map((r) => `${r.label.fi} [${Q[r.quality]}]`).join(', ')
    console.log(`    ${a.id.padEnd(20)} ${replies}`)
  }
  console.log(
    `\n  Player attacks (${enemy.playerAttacks.length}, grid of ${config.rules.playerAttackSlots})` +
      `, under "${config.difficulty}"`,
  )
  for (const a of enemy.playerAttacks) {
    const defenses = a.defenses.map((d) => Q[d.quality]).join('')
    console.log(
      `    ${a.label.fi.padEnd(20)} ${TIER[tierOf(a, difficulty, config)].padEnd(7)}` +
        `expected damage ${expectedDamage(a, difficulty).toFixed(1).padStart(5)}   defenses ${defenses}`,
    )
  }
}

// Longest label and longest line per language, to check against the text box.
const labels: Localized[] = []
const lines: Localized[] = []
for (const e of enemies) {
  labels.push(e.status)
  lines.push(e.appear, e.opening)
  for (const a of e.attacks) {
    lines.push(a.line)
    labels.push(...a.replies.map((r) => r.label))
    lines.push(...a.replies.flatMap((r) => [r.say, r.reaction]))
  }
  for (const a of e.playerAttacks) {
    labels.push(a.label)
    lines.push(a.say, ...a.defenses.map((d) => d.say))
  }
}
const longest = (texts: Localized[], l: (typeof LOCALES)[number]) =>
  texts.reduce((best, t) => ((t[l]?.length ?? 0) > best.length ? t[l] : best), '')
console.log('\nLongest texts')
for (const l of LOCALES) {
  const label = longest(labels, l)
  const line = longest(lines, l)
  console.log(
    `  ${l} label ${String(label.length).padStart(3)} / ${config.rules.maxLabelLength}  "${label}"`,
  )
  console.log(
    `  ${l} line  ${String(line.length).padStart(3)} / ${config.rules.maxLineLength}  "${line}"`,
  )
}

const status = translationStatus(files)
console.log('\nTranslations')
console.log(`  needsReview: ${LOCALES.map((l) => `${l} ${status.review[l]}`).join(', ')} texts`)
console.log(`  TODO: ${status.todo.length ? [...new Set(status.todo)].join(', ') : 'none'}`)

const problems = validateDebate(config, enemies, ui, loadProblems, specials)
console.log(`\nContent check: ${problems.length ? `${problems.length} problem(s)` : 'OK'}`)
problems.forEach((p) => console.log(`  ${formatProblem(p)}`))
if (problems.length > 0) process.exit(1)
