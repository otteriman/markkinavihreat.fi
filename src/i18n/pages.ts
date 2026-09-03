import type { Locale } from '../lib/content'

interface HomeCopy {
  metaDescription: string
  eyebrow: string
  title: string
  subtitle: string
  ctaManifesto: string
  ctaPrograms: string
  framingTitle: string
  framingBody: string
  values: { title: string; body: string }[]
  exploreTitle: string
  exploreManifesto: string
  exploreManifestoDesc: string
  explorePrograms: string
  exploreProgramsDesc: string
  exploreBlog: string
  exploreBlogDesc: string
  exploreAbout: string
  exploreAboutDesc: string
  joinTitle: string
  joinBody: string
  joinCta: string
  // A handful of team quotes reused from the programs' citations, shown as
  // random quote bands between this page's sections (see HomeBody.astro).
  citations: { person: string; quote: string }[]
}

interface AboutCopy {
  metaDescription: string
  title: string
  intro: string
}

interface ContactCopy {
  metaDescription: string
  title: string
  intro: string
}

interface ManifestoCopy {
  metaDescription: string
}

interface ProgramsCopy {
  metaDescription: string
  title: string
  intro: string
}

interface BlogCopy {
  metaDescription: string
  title: string
  intro: string
}

export const home: Record<Locale, HomeCopy> = {
  fi: {
    metaDescription:
      'Markkinavihreät on Vihreiden sisällä toimiva markkinaliberaalien ja sosiaaliliberaalien verkosto. Manifesti, ehdotukset ja tekijät.',
    eyebrow: 'Markkinavihreät',
    title: 'Markkinat ja luonto samalla puolella.',
    subtitle:
      'Olemme Vihreiden sisällä toimiva markkinaliberaalien ja sosiaaliliberaalien verkosto. Uskomme, että toimiva markkinatalous ja kunnianhimoinen ympäristöpolitiikka ratkaisevat aikamme suurimmat ongelmat tehokkaammin kuin yritystuet, sääntelyviidakko tai keskusjohtoinen suunnittelutalous.',
    ctaManifesto: 'Lue manifestimme',
    ctaPrograms: 'Tutustu ehdotuksiimme',
    framingTitle: 'Mitä markkinavihreys tarkoittaa?',
    framingBody:
      'Markkinavihreys yhdistää kaksi asiaa, joita ei Suomen puoluekentässä usein näe samassa paketissa: aidon markkinaliberalismin ja kunnianhimoisen ympäristöpolitiikan. Uskomme, että kun ulkoisvaikutukset hinnoitellaan oikein, markkinat ohjaavat resursseja tehokkaammin kuin poliitikkojen mikromanageeraus ja että tämä sama periaate pätee sekä yritystukien purkamiseen että ilmastopolitiikkaan.',
    values: [
      {
        title: 'Markkinat vastaan yritystuet',
        body: 'Puolustamme avointa kilpailua ja uusien toimijoiden markkinoillepääsyä vakiintuneiden yritysten edunvalvonnan sijasta.',
      },
      {
        title: 'Ulkoisvaikutukset hinnoitellaan',
        body: 'Päästökauppa, ruuhkamaksut ja muu markkinaehtoinen ohjaus ovat tehokkaampia kuin yksityiskohtainen sääntely.',
      },
      {
        title: 'Sivistys on investointi',
        body: 'Koulutus ja tutkimus ovat Suomen ainoa kestävä pitkän aikavälin kilpailuetu.',
      },
      {
        title: 'Liberaali demokratia ei ole kaupan',
        body: 'Oikeusvaltio, sananvapaus ja yksilönvapaudet ovat itseisarvoisen tärkeitä instituutioita.',
      },
    ],
    exploreTitle: 'Tutustu tarkemmin',
    exploreManifesto: 'Manifesti',
    exploreManifestoDesc: 'Mihin uskomme ja miksi.',
    explorePrograms: 'Ehdotukset',
    exploreProgramsDesc: 'Konkreettiset esityksemme markkinamekanismin valjastamiseksi.',
    exploreBlog: 'Blogi',
    exploreBlogDesc: 'Kirjoituksia ajankohtaisista aiheista.',
    exploreAbout: 'Ketkä',
    exploreAboutDesc: 'Tapaa markkinavihreät tekijät.',
    joinTitle: 'Tervetuloa mukaan!',
    joinBody:
      'Kutsumme sinut avoimeen markkinavihreiden WhatsApp-ryhmäämme keskustelemaan, ehdottamaan ja vaikuttamaan.',
    joinCta: 'Liity WhatsApp-ryhmään →',
    citations: [
      {
        person: 'lauri-lavanti',
        quote:
          'Markkinamekanismi on ihmiskunnan tehokkain keksintö resurssien jakamiseen. Nyt se pitää valjastaa hyvään.',
      },
      {
        person: 'atte-harjanne',
        quote: 'Markkinat voi - ja pitää - valjastaa täysillä planeetan ja ihmisten hyväksi.',
      },
      {
        person: 'arttu-laitinen',
        quote:
          'Valtion tehtävä ei ole johtaa yrityksiä, vaan asettaa kannustimet niin että ulkoisvaikutukset sisältyvät markkinahintaan.',
      },
      {
        person: 'anna-jaakola',
        quote:
          'Markkinat eivät kuulu vain kaupunkeihin. Markkinavihreys tarkoittaa myös sitä, että metsänomistaja saa korvauksen hiilen sidonnasta, viljelijä huoltovarmuudesta ja maaseudun yrittäjä luonnon ennallistamisesta.',
      },
    ],
  },
  sv: {
    metaDescription:
      'Markkinavihreät (marknadsgröna) är ett nätverk av marknadsliberaler och socialliberaler inom De Gröna. Manifest, förslag och medlemmar.',
    eyebrow: 'Markkinavihreät',
    title: 'Marknaden och naturen på samma sida.',
    subtitle:
      'Vi är ett nätverk av marknadsliberaler och socialliberaler inom De Gröna. Vi tror att en fungerande marknadsekonomi och en ambitiös miljöpolitik löser vår tids stora problem effektivare än företagsstöd, regeldjungel eller central planekonomi.',
    ctaManifesto: 'Läs vårt manifest',
    ctaPrograms: 'Se våra förslag',
    framingTitle: 'Vad betyder marknadsgrönhet?',
    framingBody:
      'Marknadsgrönhet förenar två saker som sällan syns ihop på den finländska partikartan: genuin marknadsliberalism och en ambitiös miljöpolitik. Vi tror att när externa effekter prissätts rätt styr marknaden resurser effektivare än politikers mikroledning — och att samma princip gäller både avvecklingen av företagsstöd och klimatpolitiken.',
    values: [
      {
        title: 'Marknad, inte företagsstöd',
        body: 'Vi försvarar öppen konkurrens och nya aktörers tillträde till marknaden, inte skydd för etablerade företag.',
      },
      {
        title: 'Externa effekter prissätts',
        body: 'Utsläppshandel, trängselavgifter och annan marknadsstyrning är effektivare än detaljerad reglering.',
      },
      {
        title: 'Bildning är en investering',
        body: 'Utbildning och forskning är Finlands enda hållbara konkurrensfördel.',
      },
      {
        title: 'Liberal demokrati är inte till salu',
        body: 'Rättsstaten, yttrandefriheten och individens frihet är institutioner av egenvärde.',
      },
    ],
    exploreTitle: 'Läs mer',
    exploreManifesto: 'Manifest',
    exploreManifestoDesc: 'Vad vi tror på och varför.',
    explorePrograms: 'Förslag',
    exploreProgramsDesc: 'Våra konkreta förslag för att ta marknadsmekanismen i bruk.',
    exploreBlog: 'Blogg',
    exploreBlogDesc: 'Texter om aktuella ämnen.',
    exploreAbout: 'Vilka vi är',
    exploreAboutDesc: 'Träffa de marknadsgröna medlemmarna.',
    joinTitle: 'Välkommen med!',
    joinBody:
      'Vi bjuder in dig till vår öppna WhatsApp-grupp för att diskutera, föreslå och påverka.',
    joinCta: 'Gå med i WhatsApp-gruppen →',
    citations: [
      {
        person: 'lauri-lavanti',
        quote:
          'Marknadsmekanismen är mänsklighetens mest effektiva uppfinning för att fördela resurser. Nu måste den tas i bruk för det goda.',
      },
      {
        person: 'atte-harjanne',
        quote:
          'Marknaden kan — och bör — tas i full användning till nytta för planeten och människorna.',
      },
      {
        person: 'arttu-laitinen',
        quote:
          'Statens uppgift är inte att leda företag, utan att sätta incitament så att externa effekter ingår i marknadspriset.',
      },
      {
        person: 'anna-jaakola',
        quote:
          'Marknaden hör inte bara hemma i städerna. Marknadsgrönhet innebär också att skogsägaren får ersättning för kolbindning, jordbrukaren för försörjningsberedskap och landsbygdsföretagaren för naturrestaurering.',
      },
    ],
  },
  en: {
    metaDescription:
      "Markkinavihreät (Market Greens) is a network of market-liberal and social-liberal members within Finland's Green League. Manifesto, suggestions and people.",
    eyebrow: 'Markkinavihreät',
    title: 'Markets and nature, on the same side.',
    subtitle:
      "We're a network of market-liberal and social-liberal members within Finland's Green League. We believe a well-functioning market economy and ambitious environmental policy solve the biggest problems of our time more effectively than corporate subsidies, regulatory thickets, or centrally-planned economics.",
    ctaManifesto: 'Read our manifesto',
    ctaPrograms: 'See our suggestions',
    framingTitle: 'What does "market green" mean?',
    framingBody:
      "Being market green combines two things rarely seen together on Finland's political map: genuine market liberalism and ambitious environmental policy. We believe that when externalities are priced correctly, markets allocate resources more effectively than politicians micromanaging outcomes — and that the same principle applies both to phasing out corporate subsidies and to climate policy.",
    values: [
      {
        title: 'Markets, not subsidies',
        body: 'We support open competition and market access for new entrants instead of incumbent business interests.',
      },
      {
        title: 'Price the externalities',
        body: 'Emissions trading, congestion pricing, and other market-based tools are better than detailed regulation.',
      },
      {
        title: 'Education is an investment',
        body: "Education and research are Finland's only durable long term competitive advantage.",
      },
      {
        title: 'Liberal democracy is not for sale',
        body: 'The rule of law, free speech, and individual liberty are institutions of intrinsic importance.',
      },
    ],
    exploreTitle: 'Explore further',
    exploreManifesto: 'Manifesto',
    exploreManifestoDesc: 'What we believe, and why.',
    explorePrograms: 'Suggestions',
    exploreProgramsDesc: 'Our concrete proposals for putting the market mechanism to work.',
    exploreBlog: 'Blog',
    exploreBlogDesc: 'Writing on current topics.',
    exploreAbout: 'Who we are',
    exploreAboutDesc: 'Meet the market greens.',
    joinTitle: 'Welcome aboard!',
    joinBody: 'Join our open WhatsApp group to discuss, suggest, and get involved.',
    joinCta: 'Join the WhatsApp group →',
    citations: [
      {
        person: 'lauri-lavanti',
        quote:
          "The market mechanism is humanity's most effective invention for allocating resources. Now it needs to be harnessed for good.",
      },
      {
        person: 'atte-harjanne',
        quote:
          'Markets can — and should — be put to full use for the benefit of the planet and people.',
      },
      {
        person: 'arttu-laitinen',
        quote:
          "The state's job is not to run businesses, but to set incentives so that externalities are included in the market price.",
      },
      {
        person: 'anna-jaakola',
        quote:
          "Markets don't belong only in cities. Being market green also means the forest owner gets compensated for carbon sequestration, the farmer for security of supply, and the rural entrepreneur for restoring nature.",
      },
    ],
  },
}

export const about: Record<Locale, AboutCopy> = {
  fi: {
    metaDescription:
      'Tapaa markkinavihreät — Vihreiden sisällä toimivat markkinaliberaalit ja sosiaaliliberaalit.',
    title: 'Ketkä',
    intro:
      'Markkinavihreät on joukko Vihreiden jäseniä, luottamushenkilöitä ja aktiiveja, joita yhdistää usko markkinatalouden ja kunnianhimoisen ympäristöpolitiikan yhteensopivuuteen.',
  },
  sv: {
    metaDescription:
      'Träffa de marknadsgröna — marknadsliberaler och socialliberaler inom De Gröna.',
    title: 'Vilka vi är',
    intro:
      'Markkinavihreät (de marknadsgröna) är en grupp medlemmar, förtroendevalda och aktiva inom De Gröna som förenas av tron att marknadsekonomi och ambitiös miljöpolitik går hand i hand.',
  },
  en: {
    metaDescription:
      "Meet the market greens — market-liberal and social-liberal members of Finland's Green League.",
    title: 'Who we are',
    intro:
      'Markkinavihreät is a group of Green League members, elected officials, and activists united by a belief that market economics and ambitious environmental policy belong together.',
  },
}

export const contact: Record<Locale, ContactCopy> = {
  fi: {
    metaDescription: 'Ota yhteyttä markkinavihreisiin — medialle, WhatsApp-ryhmä ja muut kanavat.',
    title: 'Yhteystiedot',
    intro:
      'Ota yhteyttä, jos haluat jutella markkinavihreydestä, mediatiedusteluissa tai liittyäksesi mukaan.',
  },
  sv: {
    metaDescription: 'Kontakta de marknadsgröna — för media, WhatsApp-gruppen och andra kanaler.',
    title: 'Kontakt',
    intro:
      'Hör av dig om du vill diskutera marknadsgrönhet, för medieförfrågningar, eller för att gå med.',
  },
  en: {
    metaDescription:
      'Contact the market greens — media inquiries, the WhatsApp group, and other channels.',
    title: 'Contact',
    intro:
      'Get in touch if you want to talk about market-green politics, for media inquiries, or to get involved.',
  },
}

export const manifestoPage: Record<Locale, ManifestoCopy> = {
  fi: { metaDescription: 'Markkinavihreä manifesti — mihin uskomme ja miksi.' },
  sv: { metaDescription: 'Det marknadsgröna manifestet — vad vi tror på och varför.' },
  en: { metaDescription: 'The market-green manifesto — what we believe, and why.' },
}

export const programsPage: Record<Locale, ProgramsCopy> = {
  fi: {
    metaDescription:
      'Markkinavihreiden konkreettiset ehdotukset markkinamekanismin valjastamiseksi.',
    title: 'Ehdotukset',
    intro:
      'Konkreettiset esityksemme siitä, miten markkinamekanismi valjastetaan ratkaisemaan yhteisiä ongelmia.',
  },
  sv: {
    metaDescription: 'De marknadsgrönas konkreta förslag för att ta marknadsmekanismen i bruk.',
    title: 'Förslag',
    intro:
      'Våra konkreta förslag för hur marknadsmekanismen kan tas i bruk för att lösa gemensamma problem.',
  },
  en: {
    metaDescription:
      "The market greens' concrete suggestions for putting the market mechanism to work.",
    title: 'Suggestions',
    intro:
      'Our concrete proposals for putting the market mechanism to work solving shared problems.',
  },
}

export const blogPage: Record<Locale, BlogCopy> = {
  fi: {
    metaDescription: 'Markkinavihreiden blogi — kirjoituksia ajankohtaisista aiheista.',
    title: 'Blogi',
    intro: 'Kirjoituksia ajankohtaisista aiheista markkinavihreästä näkökulmasta.',
  },
  sv: {
    metaDescription: 'De marknadsgrönas blogg — texter om aktuella ämnen.',
    title: 'Blogg',
    intro: 'Texter om aktuella ämnen ur ett marknadsgrönt perspektiv.',
  },
  en: {
    metaDescription: "The market greens' blog — writing on current topics.",
    title: 'Blog',
    intro: 'Writing on current topics from a market-green perspective.',
  },
}
