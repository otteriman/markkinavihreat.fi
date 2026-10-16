import type { Locale } from '../content'
import type { Localized, UiStrings } from './types'

/** A text to show: either a UI string by key with placeholders, or a content text. */
export type Message =
  { key: string; vars?: Record<string, Localized | number> } | { text: Localized }

/** The text in `locale`, falling back to Finnish while a translation is still "TODO". */
export function localize(text: Localized, locale: Locale): string {
  const value = text[locale]
  return !value || value.startsWith('TODO') ? text.fi : value
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
