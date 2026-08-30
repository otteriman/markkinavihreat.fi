import type { Locale } from '../lib/content'

export const ui = {
  fi: {
    'nav.home': 'Etusivu',
    'nav.about': 'Ketkä',
    'nav.manifesto': 'Manifesti',
    'nav.programs': 'Ehdotukset',
    'nav.blog': 'Blogi',
    'nav.contact': 'Yhteystiedot',
    'nav.whatsapp': 'Liity WhatsApp-ryhmään',
    'nav.lang': 'Kieli',
    'footer.license': 'Sisältö julkaistu lisenssillä',
    'footer.disclaimer': 'Markkinavihreät ei ole Vihreä liiton virallinen sivusto.',
    'blog.readMore': 'Lue lisää',
    'blog.empty': 'Blogikirjoituksia ei vielä ole julkaistu.',
    'programs.empty': 'Ehdotuksia ei vielä ole julkaistu.',
    'programs.joinCta': 'Vaihda aitoon markkinapuolueeseen',
    'contact.whatsappCta': 'Liity markkinavihreiden avoimeen WhatsApp-ryhmään',
    'contact.joinCta': 'Liity Vihreisiin',
    'contact.mediaHeading': 'Yhteystiedot medialle',
    'chart.ruokaostostuki.title': 'Ruokaostostuki tuloviidenneksittäin',
    'chart.ruokaostostuki.desc':
      'Pylväskaavio, joka vertaa ruoan alennetusta arvonlisäverokannasta koituvaa ruokaostostukea pienituloisimman ja suurituloisimman tuloviidenneksen välillä. Tarkat luvut ovat kaavion alla olevassa taulukossa.',
    'chart.ruokaostostuki.lowLabel': 'I Pienituloisin 20 %',
    'chart.ruokaostostuki.highLabel': 'V Suurituloisin 20 %',
    'chart.ruokaostostuki.paidLabel': 'Maksettu alv',
    'chart.ruokaostostuki.subsidyLabel': 'Ruokaostostuki',
    'chart.ruokaostostuki.totalLabel': 'yleisellä kannalla',
    'chart.ruokaostostuki.tableCaption':
      'Ruokaostostuki tuloviidenneksittäin, euroa kulutusyksikköä kohden vuodessa',
  },
  sv: {
    'nav.home': 'Hem',
    'nav.about': 'Vilka vi är',
    'nav.manifesto': 'Manifest',
    'nav.programs': 'Förslag',
    'nav.blog': 'Blogg',
    'nav.contact': 'Kontakt',
    'nav.whatsapp': 'Gå med i WhatsApp-gruppen',
    'nav.lang': 'Språk',
    'footer.license': 'Innehållet publiceras under licensen',
    'footer.disclaimer': 'Markkinavihreät är inte De Grönas officiella webbplats.',
    'blog.readMore': 'Läs mer',
    'blog.empty': 'Inga blogginlägg har publicerats än.',
    'programs.empty': 'Inga förslag har publicerats än.',
    'programs.joinCta': 'Byt till ett äkta marknadsparti',
    'contact.whatsappCta': 'Gå med i marknadsgrönas öppna WhatsApp-grupp',
    'contact.joinCta': 'Gå med i De Gröna',
    'contact.mediaHeading': 'Kontaktuppgifter för media',
    'chart.ruokaostostuki.title': 'Matinköpsstödet per inkomstkvintil',
    'chart.ruokaostostuki.desc':
      'Stapeldiagram som jämför det matinköpsstöd som den sänkta momssatsen på mat ger upphov till, mellan den lägsta och högsta inkomstkvintilen. Exakta siffror finns i tabellen under diagrammet.',
    'chart.ruokaostostuki.lowLabel': 'I Lägsta 20 %',
    'chart.ruokaostostuki.highLabel': 'V Högsta 20 %',
    'chart.ruokaostostuki.paidLabel': 'Betald moms',
    'chart.ruokaostostuki.subsidyLabel': 'Matinköpsstöd',
    'chart.ruokaostostuki.totalLabel': 'vid allmän skattesats',
    'chart.ruokaostostuki.tableCaption':
      'Matinköpsstöd per inkomstkvintil, euro per konsumtionsenhet och år',
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'Who we are',
    'nav.manifesto': 'Manifesto',
    'nav.programs': 'Suggestions',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'nav.whatsapp': 'Join the WhatsApp group',
    'nav.lang': 'Language',
    'footer.license': 'Content published under the',
    'footer.disclaimer': 'Markkinavihreät is not an official site of the Green League.',
    'blog.readMore': 'Read more',
    'blog.empty': 'No blog posts have been published yet.',
    'programs.empty': 'No suggestions have been published yet.',
    'programs.joinCta': 'Switch to a genuine market party',
    'contact.whatsappCta': "Join the market greens' open WhatsApp group",
    'contact.joinCta': 'Join the Greens',
    'contact.mediaHeading': 'Media contact',
    'chart.ruokaostostuki.title': 'The food-purchase subsidy by income quintile',
    'chart.ruokaostostuki.desc':
      "Bar chart comparing the implicit subsidy from Finland's reduced food VAT rate between the lowest and highest income quintile. Exact figures are in the table below the chart.",
    'chart.ruokaostostuki.lowLabel': 'I Lowest 20%',
    'chart.ruokaostostuki.highLabel': 'V Highest 20%',
    'chart.ruokaostostuki.paidLabel': 'VAT paid',
    'chart.ruokaostostuki.subsidyLabel': 'Food-purchase subsidy',
    'chart.ruokaostostuki.totalLabel': 'at the general rate',
    'chart.ruokaostostuki.tableCaption':
      'Food-purchase subsidy by income quintile, euros per consumption unit per year',
  },
} as const

export type UiKey = keyof (typeof ui)['fi']

export function t(locale: Locale, key: UiKey): string {
  return ui[locale][key] ?? ui.fi[key]
}
