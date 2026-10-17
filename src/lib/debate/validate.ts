import { LOCALES, type Locale } from '../content'
import { DifficultyError, resolveDifficulty } from './difficulty'
import type { Problem } from './loader'
import { SPRITES } from './sprites'
import { isUntranslated } from './text'
import {
  QUALITIES,
  type DebateConfig,
  type Enemy,
  type Quality,
  type Special,
  type UiStrings,
} from './types'

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
  'enemy.used',
  'prompt.reply',
  'prompt.attack',
  'tag.enemyAttack',
  'tag.reply',
  'tag.playerAttack',
  'tag.enemyDefense',
  ...QUALITIES.map((q) => `effect.attack.${q}`),
  ...QUALITIES.map((q) => `effect.defend.${q}`),
  'effect.attack.backfire',
  'effect.defend.backfire',
  'effect.critical',
  'end.koLose',
  'end.koLoseResult',
  'end.pointsWin',
  'end.pointsLose',
  'end.tie',
  'end.playAgain',
  'turn.player',
  'intro.title',
  'intro.start',
  'sound.on',
  'sound.off',
  'a11y.you',
  'a11y.hit',
  'a11y.controls',
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
  constructor(
    private config: DebateConfig,
    private specials: Record<string, Special> = {},
  ) {}

  add(file: string, message: string) {
    this.problems.push({ file, message })
  }

  /**
   * A text in all three languages. `kind` adds the length limit for where it
   * shows: "label" (the option grid, the status boxes), "line" (a three-line
   * box), "bottomLine" (the four-line bottom box), "specialLine" (the enemy's
   * box grown to four lines during a cut-in).
   */
  text(
    file: string,
    where: string,
    value: unknown,
    kind?: 'label' | 'line' | 'bottomLine' | 'specialLine',
  ) {
    if (!isObj(value)) {
      this.add(file, `${where} is missing (needs "fi", "sv" and "en")`)
      return
    }
    // An empty sv or en is open work, like "TODO" (it shows the Finnish); an
    // empty fi has nothing to fall back to.
    const missing = LOCALES.filter(
      (l) => typeof value[l] !== 'string' || (l === 'fi' && !String(value[l]).trim()),
    )
    if (missing.length > 0) this.add(file, `${where} is missing: ${missing.join(', ')}`)
    this.needsReview(file, where, value.needsReview)
    const { rules } = this.config
    const max =
      kind === 'label'
        ? rules.maxLabelLength
        : kind === 'line'
          ? rules.maxLineLength
          : kind === 'bottomLine'
            ? rules.maxBottomLineLength
            : kind === 'specialLine'
              ? rules.maxSpecialLineLength
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

  /**
   * A reply's or defense's optional `critical`: one trigger, or a list of
   * them (one is picked at random). Each says who steps in, what he says and,
   * optionally, the odds.
   */
  critical(file: string, where: string, value: unknown) {
    if (value === undefined) return
    if (Array.isArray(value)) {
      if (value.length === 0) this.add(file, `${where}.critical is an empty list`)
      value.forEach((t, i) => this.trigger(file, `${where}.critical[${i}]`, t))
    } else this.trigger(file, `${where}.critical`, value)
  }

  trigger(file: string, at: string, value: unknown) {
    if (!isObj(value)) return this.add(file, `${at} must be { "by": …, "say": … }`)
    if (typeof value.by !== 'string' || !(value.by in this.specials)) {
      const known = Object.keys(this.specials).join(', ') || 'none'
      this.add(
        file,
        `${at}.by names "${String(value.by)}", which isn’t in specials/ (known: ${known})`,
      )
    }
    this.text(file, `${at}.say`, value.say, 'specialLine')
    const chance = value.chance
    if (chance !== undefined && (typeof chance !== 'number' || chance < 0 || chance > 1)) {
      this.add(file, `${at}.chance must be a number from 0 to 1 (is ${JSON.stringify(chance)})`)
    }
  }

  special(special: Special) {
    const file = special.source
    this.needsReview(file, 'file', (special as unknown as Obj).needsReview)
    // On the phase label, not in the grid: the lab's fit check measures it.
    this.text(file, 'name', special.name)
    this.text(file, 'appear', special.appear, 'line')
    if (typeof special.sprite !== 'string' || !special.sprite) this.add(file, 'sprite is missing')
    else if (!(special.sprite in SPRITES)) {
      this.add(file, `sprite "${special.sprite}" doesn’t exist in src/lib/debate/sprites.ts`)
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
    this.text(file, 'appear', enemy.appear, 'bottomLine')
    this.text(file, 'opening', enemy.opening, 'line')
    this.text(file, 'defeat', enemy.defeat, 'bottomLine')
    this.text(file, 'opensDebate', enemy.opensDebate, 'bottomLine')
    this.text(file, 'changesTopic', enemy.changesTopic, 'bottomLine')
    if (typeof enemy.sprite !== 'string' || !enemy.sprite) this.add(file, 'sprite is missing')
    else if (!(enemy.sprite in SPRITES)) {
      this.add(file, `sprite "${enemy.sprite}" doesn’t exist in src/lib/debate/sprites.ts`)
    }

    for (const attack of enemy.attacks) {
      const f = attack.source
      this.needsReview(f, 'file', (attack as unknown as Obj).needsReview)
      this.text(f, 'name', attack.name, 'label')
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
        this.text(f, `${where}.say`, reply.say, 'bottomLine')
        this.text(f, `${where}.reaction`, reply.reaction, 'line')
        this.critical(f, where, reply.critical)
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
      this.text(f, 'say', attack.say, 'bottomLine')
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
        this.critical(f, where, defense.critical)
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
    if (enemy.attacks.length === 0) {
      this.add(`${dir}/enemy-attacks/`, 'needs at least one attack')
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
    for (const key of ['announceEnemyAttack', 'announceTurns'] as const) {
      if (typeof this.config.presentation?.[key] !== 'boolean') {
        this.add('config.json', `presentation.${key} must be true or false`)
      }
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
  specials: Record<string, Special> = {},
): Problem[] {
  const checker = new Checker(config, specials)
  checker.problems.push(...loadProblems)
  checker.settings()
  checker.ui(ui)
  if (enemies.length === 0) checker.add('enemies/', 'there are no enemies')
  for (const enemy of enemies) checker.enemy(enemy)
  for (const special of Object.values(specials)) checker.special(special)
  return checker.problems
}

export const formatProblem = (p: Problem) => `src/data/debate/${p.file}: ${p.message}`

/**
 * Open translation work: texts still "TODO" or empty, and texts flagged `needsReview`,
 * per language. A file-level `needsReview` covers every text in that file.
 */
export function translationStatus(files: Record<string, unknown>) {
  const todo: string[] = []
  const review: Record<Locale, number> = { fi: 0, sv: 0, en: 0 }
  const walk = (value: unknown, file: string, inherited: Locale[]) => {
    if (Array.isArray(value)) return value.forEach((v) => walk(v, file, inherited))
    if (!isObj(value)) return
    if (LOCALES.every((l) => typeof value[l] === 'string')) {
      if (LOCALES.some((l) => isUntranslated(value[l] as string))) todo.push(file)
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
