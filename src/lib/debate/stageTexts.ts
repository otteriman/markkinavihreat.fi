import { LOCALES, type Locale } from '../content'
import { format, localize } from './text'
import {
  QUALITIES,
  criticalTriggers,
  type Critical,
  type Enemy,
  type Localized,
  type Special,
  type UiStrings,
} from './types'

/**
 * Where a text appears on the stage, which decides how much room it has.
 * "cutinTop" and "cutinBottom" are the two boxes as a special character's
 * cut-in rearranges them (the top one grown, the bottom one shrunk).
 */
export type StageBox = 'top' | 'bottom' | 'label' | 'status' | 'tag' | 'cutinTop' | 'cutinBottom'

export interface StageText {
  box: StageBox
  locale: Locale
  text: string
  /** Where the text comes from, e.g. "velkakortti.json replies[2].say". */
  source: string
}

/**
 * Every text the battle can show, in every language, with the box it goes in.
 * The lab page measures these against each font to find any that don't fit.
 */
export function stageTexts(
  enemies: Enemy[],
  ui: UiStrings,
  specials: Record<string, Special> = {},
): StageText[] {
  const out: StageText[] = []
  for (const locale of LOCALES) {
    const add = (box: StageBox, text: string, source: string) =>
      out.push({ box, locale, text, source })
    const t = (key: string, vars?: Record<string, Localized | number>) =>
      format({ key, vars }, locale, ui)

    add('status', t('status.player'), 'ui.json status.player')
    add('bottom', t('end.playAgain'), 'ui.json end.playAgain')
    for (const key of ['prompt.reply', 'prompt.attack', 'tag.enemyDefense']) {
      add('tag', t(key), `ui.json ${key}`)
    }
    for (const q of [...QUALITIES, 'backfire']) {
      add('bottom', t(`effect.attack.${q}`), `ui.json effect.attack.${q}`)
      add('bottom', t(`effect.defend.${q}`), `ui.json effect.defend.${q}`)
    }
    add('bottom', t('effect.critical'), 'ui.json effect.critical')
    add('bottom', t('turn.player'), 'ui.json turn.player')
    for (const s of Object.values(specials)) {
      add('tag', localize(s.name, locale), `${s.source} name`)
      add('cutinBottom', localize(s.appear, locale), `${s.source} appear`)
    }
    /** Special characters' lines (top box), from a reply's or defense's triggers. */
    const critical = (critical: Critical | undefined, source: string) => {
      const triggers = criticalTriggers({ critical })
      triggers.forEach((t, i) => {
        const at = Array.isArray(critical) ? `critical[${i}]` : 'critical'
        add('cutinTop', localize(t.say, locale), `${source}.${at}.say`)
      })
    }

    for (const enemy of enemies) {
      const e = enemy.id
      add('status', localize(enemy.status, locale), `${e}/enemy.json status`)
      add('bottom', localize(enemy.appear, locale), `${e}/enemy.json appear`)
      add('top', localize(enemy.opening, locale), `${e}/enemy.json opening`)
      const scores = { enemy: enemy.subject, playerScore: 100, enemyScore: 100 }
      add('bottom', localize(enemy.defeat, locale), `${e}/enemy.json defeat`)
      add('bottom', localize(enemy.opensDebate, locale), `${e}/enemy.json opensDebate`)
      add('bottom', localize(enemy.changesTopic, locale), `${e}/enemy.json changesTopic`)
      for (const kind of ['koLose', 'koLoseResult', 'pointsWin', 'pointsLose', 'tie']) {
        add('bottom', t(`end.${kind}`, scores), `ui.json end.${kind}`)
      }
      for (const a of enemy.attacks) {
        const src = `${a.id}.json`
        add(
          'bottom',
          t('enemy.used', { enemy: enemy.subject, attack: a.announce }),
          `${src} announce`,
        )
        add('top', localize(a.line, locale), `${src} line`)
        add('tag', t('tag.enemyAttack', { name: a.name }), `${src} name`)
        a.replies.forEach((r, i) => {
          add('label', localize(r.label, locale), `${src} replies[${i}].label`)
          add('tag', t('tag.reply', { name: r.label }), `${src} replies[${i}].label`)
          add('bottom', localize(r.say, locale), `${src} replies[${i}].say`)
          add('top', localize(r.reaction, locale), `${src} replies[${i}].reaction`)
          critical(r.critical, `${src} replies[${i}]`)
        })
      }
      for (const a of enemy.playerAttacks) {
        const src = `${a.id}.json`
        add('label', localize(a.label, locale), `${src} label`)
        add('tag', t('tag.playerAttack', { name: a.label }), `${src} label`)
        add('bottom', localize(a.say, locale), `${src} say`)
        a.defenses.forEach((d, i) => {
          add('top', localize(d.say, locale), `${src} defenses[${i}].say`)
          critical(d.critical, `${src} defenses[${i}]`)
        })
      }
    }
  }
  return out
}

/** The longest text per box in `locale`, for previews of the worst case. */
export function longestTexts(texts: StageText[], locale: Locale): Record<StageBox, string> {
  const best = {
    top: '',
    bottom: '',
    label: '',
    status: '',
    tag: '',
    cutinTop: '',
    cutinBottom: '',
  }
  for (const t of texts) {
    if (t.locale === locale && t.text.length > best[t.box].length) best[t.box] = t.text
  }
  return best
}
