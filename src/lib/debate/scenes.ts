import type { Enemy, Localized } from './types'

/**
 * Preview scenes for testing special characters: the lab links to
 * `/debaattipeli/?special=<id>`, which (in development and noindex previews
 * only) starts a battle where that character steps in on the first reply.
 */

/** A reply that can call special character `special` in. */
export interface ReplyTrigger {
  enemy: string
  /** The enemy attack the reply answers (its file name). */
  attack: string
  attackName: Localized
  /** Index into the attack's `replies`. */
  reply: number
  replyLabel: Localized
}

/** Every reply, across `enemies`, whose critical trigger names `special`. */
export function replyTriggers(enemies: Enemy[], special: string): ReplyTrigger[] {
  return enemies.flatMap((enemy) =>
    enemy.attacks.flatMap((attack) =>
      attack.replies.flatMap((reply, i) =>
        reply.critical?.by === special
          ? [
              {
                enemy: enemy.id,
                attack: attack.id,
                attackName: attack.name,
                reply: i,
                replyLabel: reply.label,
              },
            ]
          : [],
      ),
    ),
  )
}

/** Comebacks (in the enemies' player-attacks) whose critical trigger names `special`. */
export function defenseTriggerCount(enemies: Enemy[], special: string): number {
  return enemies.reduce(
    (n, enemy) =>
      n +
      enemy.playerAttacks.reduce(
        (m, attack) => m + attack.defenses.filter((d) => d.critical?.by === special).length,
        0,
      ),
    0,
  )
}

/**
 * The battle setup for `special`'s scene: a copy of `enemy` in which every
 * trigger naming him always fires, and the attack to open with (the first
 * one with a reply that calls him in), or null if no reply of this enemy does.
 */
export function specialScene(
  enemy: Enemy,
  special: string,
): { enemy: Enemy; firstAttack: string | null } {
  const always = <T extends { critical?: { by: string } }>(item: T): T =>
    item.critical?.by === special ? { ...item, critical: { ...item.critical, chance: 1 } } : item
  const copy: Enemy = {
    ...enemy,
    attacks: enemy.attacks.map((a) => ({ ...a, replies: a.replies.map(always) })),
    playerAttacks: enemy.playerAttacks.map((a) => ({ ...a, defenses: a.defenses.map(always) })),
  }
  const first = replyTriggers([enemy], special)[0]
  return { enemy: copy, firstAttack: first?.attack ?? null }
}
