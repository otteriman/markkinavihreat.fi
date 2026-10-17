import type { Locale } from '../content'
import type { Localized, UiStrings } from './types'

/** A text to show: either a UI string by key with placeholders, or a content text. */
export type Message =
  { key: string; vars?: Record<string, Localized | number> } | { text: Localized }

/** A translation still to be written: "TODO", or left empty. */
export function isUntranslated(value: string | undefined): boolean {
  return !value?.trim() || value.startsWith('TODO')
}

/** The text in `locale`, falling back to Finnish while a translation is still "TODO" or empty. */
export function localize(text: Localized, locale: Locale): string {
  const value = text[locale]
  return isUntranslated(value) ? text.fi : value
}

/** Resolves a message: fills `{name}` placeholders, localizing any text values. */
export function format(message: Message, locale: Locale, ui: UiStrings): string {
  if ('text' in message) return localize(message.text, locale)
  const entry = ui[message.key]
  if (!entry) throw new Error(`Unknown debate UI key "${message.key}"`)
  return localize(entry, locale).replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = message.vars?.[name]
    if (value === undefined) return match
    return typeof value === 'number' ? String(value) : localize(value, locale)
  })
}
