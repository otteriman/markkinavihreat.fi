// Parliamentary electoral districts a candidate can run in. Team entries store
// the language-neutral key (`district`), so the about page can group and
// filter candidates the same way in every locale. Add a district here when the
// first candidate from it joins; names match the ones in `candidateBadge`.
import type { Locale } from './content'

export const DISTRICTS = [
  'helsinki',
  'uusimaa',
  'varsinais-suomi',
  'satakunta',
  'pirkanmaa',
  'kaakkois-suomi',
  'savo-karjala',
  'vaasa',
  'oulu',
] as const

export type District = (typeof DISTRICTS)[number]

export const districtNames: Record<Locale, Record<District, string>> = {
  fi: {
    helsinki: 'Helsinki',
    uusimaa: 'Uusimaa',
    'varsinais-suomi': 'Varsinais-Suomi',
    satakunta: 'Satakunta',
    pirkanmaa: 'Pirkanmaa',
    'kaakkois-suomi': 'Kaakkois-Suomi',
    'savo-karjala': 'Savo-Karjala',
    vaasa: 'Vaasan vaalipiiri',
    oulu: 'Oulun vaalipiiri',
  },
  sv: {
    helsinki: 'Helsingfors',
    uusimaa: 'Nyland',
    'varsinais-suomi': 'Egentliga Finland',
    satakunta: 'Satakunta',
    pirkanmaa: 'Birkaland',
    'kaakkois-suomi': 'Sydöstra Finland',
    'savo-karjala': 'Savolax–Karelen',
    vaasa: 'Vasa valkrets',
    oulu: 'Uleåborgs valkrets',
  },
  en: {
    helsinki: 'Helsinki',
    uusimaa: 'Uusimaa',
    'varsinais-suomi': 'Southwest Finland',
    satakunta: 'Satakunta',
    pirkanmaa: 'Pirkanmaa',
    'kaakkois-suomi': 'Southeast Finland',
    'savo-karjala': 'Savo-Karelia',
    vaasa: 'Vaasa constituency',
    oulu: 'Oulu constituency',
  },
}
