import type { Locale } from '../content'

/**
 * Types for the debate game ("Vihreä väittely"). Content lives in
 * src/data/debate/ (see the README there); these describe its shape once
 * loaded by loader.ts.
 */

/** A text in every language. `needsReview` lists drafts a human hasn't checked. */
export interface Localized {
  fi: string
  sv: string
  en: string
  needsReview?: Locale[]
}

/** How good a reply or defense is. Damage per quality lives in config.json. */
export type Quality = 'strong' | 'medium' | 'weak'
export const QUALITIES: readonly Quality[] = ['strong', 'medium', 'weak']

/** One of the player's possible replies to an enemy attack. */
export interface Reply {
  label: Localized
  quality: Quality
  /** What the player says (bottom box). */
  say: Localized
  /** The enemy's comeback (top box). */
  reaction: Localized
  /** A special character may step in and make this reply's hit critical. */
  critical?: CriticalTrigger
}

export interface EnemyAttack {
  /** File name without .json. */
  id: string
  /** Path of the source file inside src/data/debate/, for error messages. */
  source: string
  /** The attack's name on its own, for the phase label: "Hyökkäys: {name}". */
  name: Localized
  /** The attack's name as it fits "{enemy} käytti {attack}!". */
  announce: Localized
  /** The enemy's line (top box). */
  line: Localized
  replies: Reply[]
}

/** One of the enemy's possible comebacks to a player attack. */
export interface Defense {
  quality: Quality
  say: Localized
  /** A special character may step in and make this defense's hit critical. */
  critical?: CriticalTrigger
}

/**
 * A special character (src/data/debate/specials/<id>.json): someone outside
 * the debate who can step in, say something and turn a hit into a critical
 * hit. Any reply or defense can call one in with a `critical` trigger.
 */
export interface Special {
  /** File name without .json; triggers name it in `by`. */
  id: string
  source: string
  /** His name, on the label over his line, e.g. "Pääkirjoitustoimittaja". */
  name: Localized
  /** Narration as he steps in, e.g. "Pääkirjoitustoimittaja astuu esiin!". */
  appear: Localized
  /** Sprite id (src/lib/debate/sprites.ts). */
  sprite: string
}

/**
 * On a reply or defense: when its hit does damage, special character `by`
 * may step in (with `chance`, or the difficulty's critical.chance), say
 * `say`, and make the hit critical: it does extra damage.
 */
export interface CriticalTrigger {
  by: string
  say: Localized
  /** 0–1; defaults to the difficulty's critical.chance. */
  chance?: number
}

export interface PlayerAttack {
  id: string
  source: string
  /** Position in the attack grid; attacks without one come after, by file name. */
  order?: number
  label: Localized
  say: Localized
  defenses: Defense[]
}

export interface Enemy {
  /** Folder name under src/data/debate/enemies/. */
  id: string
  source: string
  /** Name in the status box, e.g. "KANSALLISKONS.". */
  status: Localized
  /** Short name used as a sentence subject in narration, e.g. "Konservatiivi". */
  subject: Localized
  /** Narration when the battle starts, e.g. "Villi kansalliskonservatiivi ilmestyi!". */
  appear: Localized
  /** The enemy's opening line (top box). */
  opening: Localized
  /**
   * Narration when he is knocked out, as he slides off the stage, e.g.
   * "Konservatiivi hävisi väittelyn, ja pakeni Twitteriin!".
   */
  defeat: Localized
  /** Sprite id (src/lib/debate/sprites.ts, added in a later phase). */
  sprite: string
  attacks: EnemyAttack[]
  playerAttacks: PlayerAttack[]
}

/** The numbers for one side of the battle. */
export interface SideSettings {
  /** Starting KANNATUS. */
  kannatus: number
  /** A full hit taken by this side. */
  baseDamage: number
  /** Share of `baseDamage` that lands, by the quality of this side's reply or defense. */
  damage: Record<Quality, number>
  /**
   * Share of `baseDamage` this side takes when its own attack meets a perfect
   * (strong) defense: the attack backfires. 0 turns backfiring off.
   */
  counter: number
}

/** A fully resolved difficulty preset: every knob the battle reads. */
export interface Difficulty {
  /**
   * The battle runs until one side's KANNATUS reaches 0. This is only a safety
   * net: if it is reached, the battle is decided on points.
   */
  maxRounds: number
  player: SideSettings
  enemy: SideSettings
  /** Relative odds of the enemy picking a defense of each quality. */
  enemyDefenseWeights: Record<Quality, number>
  /** A final points difference up to this counts as a tie. */
  tieMargin: number
  /**
   * Critical hits (special characters stepping in). Without this, they never
   * happen. `chance` is the default odds for a trigger that sets none; a
   * critical hit does `extraMin`–`extraMax` more damage (a whole number,
   * every value equally likely).
   */
  critical?: CriticalSettings
}

export interface CriticalSettings {
  chance: number
  extraMin: number
  extraMax: number
}

/** A preset as written in config.json: any subset of the knobs, plus `extends`. */
export type DifficultyPreset = DeepPartial<Difficulty> & { extends?: string }

type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K]
}

/** Rules the content must follow; the validator reads them from config.json. */
export interface ContentRules {
  repliesPerAttack: number
  replyMix: Record<Quality, number>
  defensesPerAttack: number
  minStrongDefenses: number
  /** Size of the player's attack grid (2×3). */
  playerAttackSlots: number
  maxLabelLength: number
  maxLineLength: number
}

export type StrategyName =
  'perfect' | 'mostlyStrong' | 'allMedium' | 'strongOrWeak' | 'random' | 'greenInstinct'

export interface Guardrail {
  minWinRate?: number
  maxWinRate?: number
  minLoseRate?: number
  maxLoseRate?: number
  /** Average battle length in rounds. */
  minAvgRounds?: number
  maxAvgRounds?: number
}

export type Tier = 'vahva' | 'hyva' | 'heikko'

export interface DebateConfig {
  rules: ContentRules
  /** Player attack tiers by expected damage, as a share of a full hit on the enemy. */
  tiers: { vahva: number; hyva: number }
  typing: { msPerChar: number }
  /** How the battle is shown; doesn't change the rules. */
  presentation: PresentationOptions
  /** The preset the game ships with. */
  difficulty: string
  difficulties: Record<string, DifficultyPreset>
  /** Per preset: what each play style's outcome must stay within (checked by tests). */
  guardrails: Record<string, Partial<Record<StrategyName, Guardrail>>>
}

export type UiStrings = Record<string, Localized>

export interface PresentationOptions {
  /**
   * Narrate each enemy attack ("Konservatiivi käytti VELKAPANIIKKIA!") before
   * his line. Off by default: the label on his box ("Hyökkäys: Velkapaniikki")
   * already names it. The texts stay in the content, so turning this back on
   * is all it takes to bring the line back.
   */
  announceEnemyAttack: boolean
}
