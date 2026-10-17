import type { Enemy, EnemyAttack, PlayerAttack, Special } from './types'

/** A content problem, tied to the file it's in (relative to src/data/debate/). */
export interface Problem {
  file: string
  message: string
}

const PATTERN = /enemies\/([^/]+)\/(?:(enemy-attacks|player-attacks)\/)?([^/]+)\.json$/

/**
 * Builds the enemies from the content files, keyed by path. In the site the
 * files come from `import.meta.glob` (data.ts); in Node scripts from the file
 * system (scripts/debate/load.ts). Any path ending in
 * `enemies/<enemy>/enemy.json`, `.../enemy-attacks/<id>.json` or
 * `.../player-attacks/<id>.json` works, so both sources feed the same code.
 *
 * Only assembles; content rules are checked by validate.ts.
 */
export function assembleEnemies(files: Record<string, unknown>): {
  enemies: Enemy[]
  problems: Problem[]
} {
  const problems: Problem[] = []
  const byId = new Map<string, { enemy?: Enemy; attacks: EnemyAttack[]; player: PlayerAttack[] }>()
  const slot = (id: string) => {
    if (!byId.has(id)) byId.set(id, { attacks: [], player: [] })
    return byId.get(id)!
  }

  for (const path of Object.keys(files).sort()) {
    const data = files[path] as Record<string, unknown>
    const match = PATTERN.exec(path)
    const file = path.slice(path.lastIndexOf('enemies/'))
    if (!match || (!match[2] && match[3] !== 'enemy')) {
      problems.push({
        file,
        message:
          'unexpected file: content goes in enemies/<enemy>/enemy.json, ' +
          'enemies/<enemy>/enemy-attacks/<id>.json or enemies/<enemy>/player-attacks/<id>.json',
      })
      continue
    }
    const [, enemyId, folder, id] = match
    const entry = slot(enemyId)
    if (folder === 'enemy-attacks') {
      entry.attacks.push({ ...data, id, source: file } as unknown as EnemyAttack)
    } else if (folder === 'player-attacks') {
      entry.player.push({ ...data, id, source: file } as unknown as PlayerAttack)
    } else {
      entry.enemy = { ...data, id: enemyId, source: file } as unknown as Enemy
    }
  }

  const enemies: Enemy[] = []
  for (const [id, entry] of byId) {
    if (!entry.enemy) {
      problems.push({ file: `enemies/${id}/enemy.json`, message: 'missing: every enemy needs one' })
      continue
    }
    enemies.push({
      ...entry.enemy,
      attacks: entry.attacks,
      playerAttacks: sortAttacks(entry.player),
    })
  }
  return { enemies, problems }
}

const SPECIAL = /specials\/([^/]+)\.json$/

/**
 * Builds the special characters from `specials/<id>.json` files, keyed by id.
 * Like assembleEnemies, the files come from import.meta.glob or the file
 * system; validate.ts checks their content.
 */
export function assembleSpecials(files: Record<string, unknown>): {
  specials: Record<string, Special>
  problems: Problem[]
} {
  const specials: Record<string, Special> = {}
  const problems: Problem[] = []
  for (const path of Object.keys(files).sort()) {
    const match = SPECIAL.exec(path)
    const file = path.slice(path.lastIndexOf('specials/'))
    if (!match) {
      problems.push({
        file,
        message: 'unexpected file: special characters go in specials/<id>.json',
      })
      continue
    }
    const id = match[1]
    specials[id] = { ...(files[path] as object), id, source: file } as Special
  }
  return { specials, problems }
}

/** Grid order: by `order`, then attacks without one, by id. */
export function sortAttacks(attacks: PlayerAttack[]): PlayerAttack[] {
  return [...attacks].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}
