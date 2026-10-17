import { describe, expect, it } from 'vitest'
import { startBattle } from '../../src/lib/debate/battle'
import { enemies } from '../../src/lib/debate/data'
import { seededRng } from '../../src/lib/debate/rng'
import { defenseTriggerCount, replyTriggers, specialScene } from '../../src/lib/debate/scenes'
import { specDifficulty, specEnemy, txt } from './debate-fixtures'

/** The fixture enemy with the editor on a2's third reply (chance 0.1) and one comeback. */
function enemyWithEditor() {
  const enemy = specEnemy()
  enemy.attacks[1].replies[2].critical = { by: 'editor', say: txt('line'), chance: 0.1 }
  enemy.playerAttacks[0].defenses[1].critical = { by: 'editor', say: txt('line') }
  return enemy
}

describe('special character scenes', () => {
  it('finds the replies and comebacks that call a character in', () => {
    const enemy = enemyWithEditor()
    expect(replyTriggers([enemy], 'editor')).toEqual([
      {
        enemy: 'test',
        attack: 'a2',
        attackName: enemy.attacks[1].name,
        reply: 2,
        replyLabel: enemy.attacks[1].replies[2].label,
      },
    ])
    expect(defenseTriggerCount([enemy], 'editor')).toBe(1)
    expect(replyTriggers([enemy], 'nobody')).toEqual([])
  })

  it('a scene opens with his attack and makes his triggers always fire', () => {
    const enemy = enemyWithEditor()
    const scene = specialScene(enemy, 'editor')
    expect(scene.firstAttack).toBe('a2')
    expect(scene.enemy.attacks[1].replies[2].critical?.chance).toBe(1)
    expect(scene.enemy.playerAttacks[0].defenses[1].critical?.chance).toBe(1)
    // The content itself is untouched.
    expect(enemy.attacks[1].replies[2].critical?.chance).toBe(0.1)
    expect(specialScene(specEnemy(), 'editor').firstAttack).toBeNull()
  })

  it('startBattle can open with a given attack', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { state } = startBattle({
        enemy: specEnemy(),
        difficulty: specDifficulty(),
        attackSlots: 6,
        rng: seededRng(seed),
        firstAttack: 'a3',
      })
      expect(state.enemyAttacks[0].id).toBe('a3')
      expect(new Set(state.enemyAttacks.map((a) => a.id))).toEqual(
        new Set(['a1', 'a2', 'a3', 'a4']),
      )
    }
  })

  it('the real content has a scene for the Pääkirjoitustoimittaja', () => {
    const triggers = replyTriggers(enemies, 'paakirjoitustoimittaja')
    expect(triggers.map((t) => t.replyLabel.fi)).toContain('Veronkorotus')
  })
})
