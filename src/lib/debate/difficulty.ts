import { QUALITIES, type DebateConfig, type Difficulty, type DifficultyPreset } from './types'

export class DifficultyError extends Error {}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function merge(base: Obj, over: Obj): Obj {
  const out: Obj = { ...base }
  for (const [key, value] of Object.entries(over)) {
    out[key] = isObj(value) && isObj(base[key]) ? merge(base[key] as Obj, value) : value
  }
  return out
}

/** The preset's knobs with every `extends` applied, unvalidated. */
function flatten(config: DebateConfig, name: string, seen: string[] = []): Obj {
  const preset = config.difficulties[name]
  if (!preset) {
    const known = Object.keys(config.difficulties).join(', ')
    throw new DifficultyError(`Unknown difficulty "${name}" (known: ${known})`)
  }
  if (seen.includes(name)) {
    throw new DifficultyError(`Difficulty "extends" loops: ${[...seen, name].join(' → ')}`)
  }
  const { extends: parent, ...own } = preset as DifficultyPreset
  return parent ? merge(flatten(config, parent, [...seen, name]), own) : own
}

/** Sets `path` ("player.damage.medium") on a copy of `obj`; the path must already exist. */
function setPath(obj: Obj, path: string, value: number, full = path): Obj {
  const [head, ...rest] = path.split('.')
  if (!(head in obj)) throw new DifficultyError(`Unknown difficulty setting "${full}"`)
  if (rest.length === 0) {
    if (typeof obj[head] !== 'number') {
      throw new DifficultyError(`"${full}" is a group of settings, not a number`)
    }
    return { ...obj, [head]: value }
  }
  if (!isObj(obj[head])) throw new DifficultyError(`Unknown difficulty setting "${full}"`)
  return { ...obj, [head]: setPath(obj[head] as Obj, rest.join('.'), value, full) }
}

function check(name: string, d: Obj): Difficulty {
  const problems: string[] = []
  const num = (path: string, min: number, max = Infinity, integer = false) => {
    const value = path.split('.').reduce<unknown>((o, k) => (isObj(o) ? o[k] : undefined), d)
    if (typeof value !== 'number' || Number.isNaN(value)) {
      problems.push(`${path} is missing or not a number`)
    } else if (value < min || value > max || (integer && !Number.isInteger(value))) {
      const range = max === Infinity ? `at least ${min}` : `between ${min} and ${max}`
      problems.push(`${path} must be ${integer ? 'a whole number ' : ''}${range} (is ${value})`)
    }
  }
  num('maxRounds', 1, Infinity, true)
  for (const side of ['player', 'enemy']) {
    num(`${side}.kannatus`, 1, Infinity, true)
    num(`${side}.baseDamage`, 0)
    for (const q of QUALITIES) num(`${side}.damage.${q}`, 0, 2)
    num(`${side}.counter`, 0, 2)
  }
  for (const q of QUALITIES) num(`enemyDefenseWeights.${q}`, 0)
  num('tieMargin', 0)
  if (d.critical !== undefined) {
    num('critical.chance', 0, 1)
    num('critical.extraMin', 0, Infinity, true)
    num('critical.extraMax', 0, Infinity, true)
    const c = d.critical as Record<string, number>
    if (c.extraMax < c.extraMin) problems.push('critical.extraMax can’t be less than extraMin')
  }
  const weights = d.enemyDefenseWeights as Record<string, number> | undefined
  if (weights && QUALITIES.every((q) => weights[q] === 0)) {
    problems.push('enemyDefenseWeights can’t all be 0')
  }
  if (problems.length > 0) {
    throw new DifficultyError(`Difficulty "${name}": ${problems.join('; ')}`)
  }
  return d as unknown as Difficulty
}

/**
 * Resolves a difficulty preset from config.json: applies `extends`, then any
 * one-off `overrides` ({ "player.damage.medium": 0.4 }, from `debate:balance
 * --set` or the lab page), and validates the result.
 */
export function resolveDifficulty(
  config: DebateConfig,
  name: string = config.difficulty,
  overrides: Record<string, number> = {},
): Difficulty {
  let d = flatten(config, name)
  for (const [path, value] of Object.entries(overrides)) d = setPath(d, path, value)
  return check(name, d)
}

/** A critical hit's extra damage: extraMin–extraMax, each value equally likely. */
export function criticalExtra(difficulty: Difficulty, rng: () => number): number {
  const { extraMin, extraMax } = difficulty.critical!
  return extraMin + Math.floor(rng() * (extraMax - extraMin + 1))
}

/** Damage `side` takes from a hit answered with a reply or defense of `quality`. */
export function damageFor(
  difficulty: Difficulty,
  side: 'player' | 'enemy',
  quality: keyof Difficulty['player']['damage'],
): number {
  const s = difficulty[side]
  return Math.round(s.baseDamage * s.damage[quality])
}

/** Damage `side` takes when its own attack meets a perfect defense (0: no backfire). */
export function counterFor(difficulty: Difficulty, side: 'player' | 'enemy'): number {
  const s = difficulty[side]
  return Math.round(s.baseDamage * s.counter)
}
