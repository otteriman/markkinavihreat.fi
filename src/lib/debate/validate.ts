import { LOCALES, type Locale } from '../content'
import { DifficultyError, resolveDifficulty } from './difficulty'
import type { Problem } from './loader'
import { SPRITES } from './sprites'
import { QUALITIES, type DebateConfig, type Enemy, type Quality, type UiStrings } from './types'

/**
 * Checks the debate game's content and config against the rules in
 * config.json. Every problem names its file and says what to fix, so content
 * can be edited without reading code. Used by the unit tests,
 * `npm run validate:translations` and `npm run debate:report`.
 *
 * Never imported by the page's client code, so it adds nothing to the bundle.
 */

/** UI strings the engine and page rely on; ui.json must have all of them. */
export const REQUIRED_UI_KEYS = [
  'status.player',
  'status.kannatus',
  'round.start',
  'enemy.used',
  'prompt.reply',
  'prompt.attack',
  ...QUALITIES.map((q) => `effect.attack.${q}`),
  ...QUALITIES.map((q) => `effect.defend.${q}`),
  'end.koWin',
  'end.koLose',
  'end.pointsWin',
  'end.pointsLose',
  'end.tie',
  'end.strongReplies',
  'end.playAgain',
  'sound.on',
  'sound.off',
  'page.title',
  'page.description',
  'page.lead',
  'page.noscript',
]

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

const count = (qualities: unknown[]) =>
  Object.fromEntries(QUALITIES.map((q) => [q, qualities.filter((x) => x === q).length])) as Record<
    Quality,
    number
  >

const describeMix = (mix: Record<Quality, number>) =>
  QUALITIES.map((q) => `${mix[q]} ${q}`).join(', ')

class Checker {
  problems: Problem[] = []
  constructor(private config: DebateConfig) {}

  add(file: string, message: string) {
    this.problems.push({ file, message })
  }

  /** A text in all three languages. `kind` "label" or "line" adds the length limit. */
  text(file: string, where: string, value: unknown, kind?: 'label' | 'line') {
    if (!isObj(value)) {
      this.add(file, `${where} is missing (needs "fi", "sv" and "en")`)
      return
    }
    const missing = LOCALES.filter((l) => typeof value[l] !== 'string' || !String(value[l]).trim())
    if (missing.length > 0) this.add(file, `${where} is missing: ${missing.join(', ')}`)
    this.needsReview(file, where, value.needsReview)
    const max =
      kind === 'label'
        ? this.config.rules.maxLabelLength
        : kind === 'line'
          ? this.config.rules.maxLineLength
          : Infinity
    for (const l of LOCALES) {
      const s = value[l]
      if (typeof s === 'string' && s.length > max) {
        this.add(file, `${where} (${l}) is ${s.length} characters, the limit is ${max}: "${s}"`)
      }
    }
  }

  needsReview(file: string, where: string, value: unknown) {
    if (value === undefined) return
    if (!Array.isArray(value) || value.some((l) => !LOCALES.includes(l as Locale))) {
      this.add(file, `${where}.needsReview must be a list of languages, e.g. ["sv", "en"]`)
    }
  }

  quality(file: string, where: string, value: unknown) {
    if (!QUALITIES.includes(value as Quality)) {
      this.add(
        file,
        `${where}.quality must be "strong", "medium" or "weak" (is ${JSON.stringify(value)})`,
      )
    }
  }

  enemy(enemy: Enemy) {
    const { rules } = this.config
    const file = enemy.source
    this.needsReview(file, 'file', (enemy as unknown as Obj).needsReview)
    this.text(file, 'status', enemy.status, 'label')
    this.text(file, 'subject', enemy.subject, 'label')
    this.text(file, 'appear', enemy.appear, 'line')
    this.text(file, 'opening', enemy.opening, 'line')
    if (typeof enemy.sprite !== 'string' || !enemy.sprite) this.add(file, 'sprite is missing')
    else if (!(enemy.sprite in SPRITES)) {
      this.add(file, `sprite "${enemy.sprite}" doesn’t exist in src/lib/debate/sprites.ts`)
    }

    for (const attack of enemy.attacks) {
      const f = attack.source
      this.needsReview(f, 'file', (attack as unknown as Obj).needsReview)
      this.text(f, 'announce', attack.announce, 'label')
      this.text(f, 'line', attack.line, 'line')
      if (!Array.isArray(attack.replies)) {
        this.add(f, 'replies is missing (a list of replies)')
        continue
      }
      if (attack.replies.length !== rules.repliesPerAttack) {
        this.add(
          f,
          `needs exactly ${rules.repliesPerAttack} replies (has ${attack.replies.length})`,
        )
      }
      attack.replies.forEach((reply, i) => {
        const where = `replies[${i}]`
        if (!isObj(reply)) return this.add(f, `${where} is not an object`)
        this.text(f, `${where}.label`, reply.label, 'label')
        this.quality(f, where, reply.quality)
        this.text(f, `${where}.say`, reply.say, 'line')
        this.text(f, `${where}.reaction`, reply.reaction, 'line')
      })
      const mix = count(attack.replies.map((r) => (isObj(r) ? r.quality : undefined)))
      if (QUALITIES.some((q) => mix[q] !== rules.replyMix[q])) {
        this.add(
          f,
          `replies need exactly ${describeMix(rules.replyMix)} (found ${describeMix(mix)})`,
        )
      }
    }

    for (const attack of enemy.playerAttacks) {
      const f = attack.source
      this.needsReview(f, 'file', (attack as unknown as Obj).needsReview)
      if (attack.order !== undefined && typeof attack.order !== 'number') {
        this.add(f, 'order must be a number')
      }
      this.text(f, 'label', attack.label, 'label')
      this.text(f, 'say', attack.say, 'line')
      if (!Array.isArray(attack.defenses)) {
        this.add(f, 'defenses is missing (a list of the enemy’s comebacks)')
        continue
      }
      if (attack.defenses.length !== rules.defensesPerAttack) {
        this.add(
          f,
          `needs exactly ${rules.defensesPerAttack} defenses (has ${attack.defenses.length})`,
        )
      }
      attack.defenses.forEach((defense, i) => {
        const where = `defenses[${i}]`
        if (!isObj(defense)) return this.add(f, `${where} is not an object`)
        this.quality(f, where, defense.quality)
        this.text(f, `${where}.say`, defense.say, 'line')
      })
      const strong = attack.defenses.filter((d) => isObj(d) && d.quality === 'strong').length
      if (strong < rules.minStrongDefenses) {
        this.add(
          f,
          `needs at least ${rules.minStrongDefenses} strong defense (has ${strong}): ` +
            'every attack must be beatable',
        )
      }
    }

    const dir = `enemies/${enemy.id}`
    if (enemy.playerAttacks.length < rules.playerAttackSlots) {
      this.add(
        `${dir}/player-attacks/`,
        `needs at least ${rules.playerAttackSlots} player attacks to fill the grid ` +
          `(has ${enemy.playerAttacks.length})`,
      )
    }
    for (const name of Object.keys(this.config.difficulties)) {
      const rounds = this.safeRounds(name)
      if (rounds === undefined) continue
      if (enemy.attacks.length < rounds) {
        this.add(
          `${dir}/enemy-attacks/`,
          `difficulty "${name}" has ${rounds} rounds, so the enemy needs at least ${rounds} ` +
            `attacks (has ${enemy.attacks.length})`,
        )
      }
      if (rounds > rules.playerAttackSlots) {
        this.add(
          'config.json',
          `difficulty "${name}" has ${rounds} rounds but the player only has ` +
            `${rules.playerAttackSlots} attack slots`,
        )
      }
    }
  }

  private safeRounds(name: string) {
    try {
      return resolveDifficulty(this.config, name).rounds
    } catch {
      return undefined // reported by config()
    }
  }

  settings() {
    const { rules, difficulties, difficulty, guardrails } = this.config
    const total = QUALITIES.reduce((sum, q) => sum + (rules.replyMix[q] ?? 0), 0)
    if (total !== rules.repliesPerAttack) {
      this.add(
        'config.json',
        `rules.replyMix adds up to ${total} but rules.repliesPerAttack is ${rules.repliesPerAttack}`,
      )
    }
    if (!(difficulty in difficulties)) {
      this.add('config.json', `"difficulty" names "${difficulty}", which isn’t in "difficulties"`)
    }
    for (const name of Object.keys(difficulties)) {
      try {
        resolveDifficulty(this.config, name)
      } catch (error) {
        if (!(error instanceof DifficultyError)) throw error
        this.add('config.json', error.message)
      }
    }
    for (const name of Object.keys(guardrails)) {
      if (!(name in difficulties)) {
        this.add('config.json', `guardrails for "${name}", which isn’t in "difficulties"`)
      }
    }
  }

  ui(ui: UiStrings) {
    for (const key of REQUIRED_UI_KEYS) {
      if (!(key in ui)) this.add('ui.json', `"${key}" is missing`)
    }
    for (const [key, value] of Object.entries(ui)) {
      // Page copy (page.*) sits outside the stage, so it has no length limit.
      const kind = key.startsWith('status.')
        ? 'label'
        : key.startsWith('page.')
          ? undefined
          : 'line'
      this.text('ui.json', `"${key}"`, value, kind)
    }
  }
}

export function validateDebate(
  config: DebateConfig,
  enemies: Enemy[],
  ui: UiStrings,
  loadProblems: Problem[] = [],
): Problem[] {
  const checker = new Checker(config)
  checker.problems.push(...loadProblems)
  checker.settings()
  checker.ui(ui)
  if (enemies.length === 0) checker.add('enemies/', 'there are no enemies')
  for (const enemy of enemies) checker.enemy(enemy)
  return checker.problems
}

export const formatProblem = (p: Problem) => `src/data/debate/${p.file}: ${p.message}`

/**
 * Open translation work: texts still "TODO" and texts flagged `needsReview`,
 * per language. A file-level `needsReview` covers every text in that file.
 */
export function translationStatus(files: Record<string, unknown>) {
  const todo: string[] = []
  const review: Record<Locale, number> = { fi: 0, sv: 0, en: 0 }
  const walk = (value: unknown, file: string, inherited: Locale[]) => {
    if (Array.isArray(value)) return value.forEach((v) => walk(v, file, inherited))
    if (!isObj(value)) return
    if (LOCALES.every((l) => typeof value[l] === 'string')) {
      if (LOCALES.some((l) => String(value[l]).startsWith('TODO'))) todo.push(file)
      const flagged = new Set([...inherited, ...((value.needsReview as Locale[]) ?? [])])
      for (const l of flagged) review[l]++
      return
    }
    const own = Array.isArray(value.needsReview) ? (value.needsReview as Locale[]) : []
    for (const [key, v] of Object.entries(value)) {
      if (key !== 'needsReview') walk(v, file, [...inherited, ...own])
    }
  }
  for (const [file, data] of Object.entries(files)) walk(data, file, [])
  return { todo, review }
}
