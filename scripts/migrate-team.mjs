// One-off migration: ports the team roster from vaihdavihreisiin.fi's index.html
// (#about section) into src/content/team/*.fi.md. Kept for provenance / as a
// reference for how future roster updates from the sibling site can be pulled in.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'src/content/team')
mkdirSync(OUT_DIR, { recursive: true })

/** @type {{slug: string, name: string, photo: string, candidateBadge?: string, bio: string, links: {type: string, url: string, label?: string}[]}[]} */
const people = [
  {
    slug: 'ville-aarnio',
    name: 'Ville Aarnio',
    photo: '/images/team/Ville-Aarnio.jpg',
    bio: 'Ville Aarnio on filosofi, sijoittaja ja metsänomistaja, joka toimii Talousvihreiden puheenjohtajana ja lisäksi Maaseutu- ja erävihreissä sekä vihreänä puoluevaltuutettuna. Akateemisesti hän on erikoistunut talous- ja yhteiskuntateorioiden perusteisiin kuten peli- ja päätösteoriaan. Politiikassa Aarnio pyrkii erilaisten intressien kuten taloudellisen lisäarvon ja luonnonsuojelun yhteensovittamiseen. Erityisenä osaamisalueena ovat pääomaverotus sekä metsätalous.',
    links: [{ type: 'website', url: 'https://aarnionville.fi/', label: 'aarnionville.fi' }],
  },
  {
    slug: 'sofia-alainen',
    name: 'Sofia Alainen',
    photo: '/images/team/Sofia-Alainen.jpg',
    bio: 'Sofia Alainen on tietotekniikan diplomi-insinööriopiskelija, Turun yliopiston ylioppilaskunnan hallituksen varapuheenjohtaja ja Vihreiden nuorten ja opiskelijoiden liittohallituksen jäsen. Hän on kotoisin ylisukupolviselta maatilalta Etelä-Pohjanmaalta ja maanviljelijäperheensä ensimmäisen sukupolven korkeakouluopiskelija.\n\nHänen politiikkansa ytimessä on ajatus Suomesta, jossa lähtökohdat eivät määritä tulevaisuutta. Vain ihmisen oma kyvykkyys, kunnianhimo ja unelmat.',
    links: [{ type: 'instagram', url: 'https://www.instagram.com/sofia.alainen' }],
  },
  {
    slug: 'ester-dufva',
    name: 'Ester Dufva',
    photo: '/images/team/Ester-Dufva.jpg',
    bio: 'Ester Dufva on helsinkiläinen yrittäjä, kääntäjä ja vihreä puolueaktiivi. Hänelle politiikan peruskiviä ovat luonnonsuojelu ja sosiaalinen oikeudenmukaisuus. Niiden varaan voidaan rakentaa reilu, sivistynyt ja vauras yhteiskunta, joka kannustaa ihmisiä yritteliäisyyteen ja aktiiviseen toimintaan niin pienissä kuin isoissa asioissa. FM, LuK.',
    links: [
      { type: 'website', url: 'https://esterdufva.fi', label: 'esterdufva.fi' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/ester-dufva/' },
      { type: 'instagram', url: 'https://www.instagram.com/esterdufva/' },
      { type: 'facebook', url: 'https://www.facebook.com/esterdufvavihrea' },
      { type: 'tiktok', url: 'https://www.tiktok.com/@esterdufva' },
    ],
  },
  {
    slug: 'kalle-euro',
    name: 'Kalle Euro',
    photo: '/images/team/Kalle-Euro.jpeg',
    bio: 'Kalle Euro on arkkitehtuurin, kestävän kaupunkikehityksen ja markkinatalouden puolustaja, joka liittyi Vihreisiin, koska koki puolueen yhdistävän tulevaisuususkon, sivistyksen, kansainvälisyyden ja ihmisoikeuksien puolustamisen. Pitkän Kokoomus -taustan jälkeen ratkaisevaa oli tunne siitä, että Vihreissä markkinalähtöinen talousajattelu, moderni kaupunkipolitiikka ja avoin yhteiskunta voivat kulkea yhdessä.',
    links: [
      { type: 'website', url: 'https://atl.fi/', label: 'atl.fi' },
      {
        type: 'website',
        url: 'https://www.tahdotaan-parempaa-maailmaa.com/',
        label: 'tahdotaan-parempaa-maailmaa.com',
      },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/kalle-euro-140103' },
      { type: 'facebook', url: 'https://www.facebook.com/share/1BEtFAVz34/' },
    ],
  },
  {
    slug: 'atte-harjanne',
    name: 'Atte Harjanne',
    photo: '/images/team/Atte-Harjanne.jpg',
    bio: 'Atte Harjanne on kansanedustaja, kaupunginvaltuutettu, diplomi-insinööri, ilmastonmuutostutkija ja reservin kapteeni Helsingistä. Harjanne on keskittynyt politiikassa energiaan, turvallisuuteen, teknologiaan ja talouteen sekä reilun kilpailun ja terveiden markkinoiden edistämiseen.',
    links: [
      { type: 'website', url: 'https://www.atteharjanne.fi', label: 'atteharjanne.fi' },
      { type: 'bluesky', url: 'https://bsky.app/profile/atteharjanne.vihreat.fi' },
      { type: 'threads', url: 'https://www.threads.com/@attehoo' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/atteharjanne/' },
      { type: 'instagram', url: 'https://www.instagram.com/attehoo' },
    ],
  },
  {
    slug: 'joel-himanen',
    name: 'Joel Himanen',
    photo: '/images/team/Joel-Himanen.jpg',
    bio: 'Joel Himanen on datatieteilijä ja ohjelmistokehittäjä (DI, Aalto), jota ajaa tahto ratkaista yhteiskuntamme viheliäisimpiä ongelmia yritystoiminnan kautta. Himanen uskoo hyvinvointivaltion, terveiden markkinoiden sekä markkina- ja yritysmyönteisen sääntelyn yhdistelmän olevan avain talousjärjestelmämme sovittamiseen planeettamme kantokykyyn. Hänen ideaaliyhteiskunnassa markkinavoimat on valjastettu kytkemään voitollinen yritystoiminta ja ihmiskunnan vakavimpien haasteiden ratkominen toisiinsa — maailman parantamisesta palkitaan!',
    links: [{ type: 'linkedin', url: 'https://www.linkedin.com/in/joel-himanen-784a24137/' }],
  },
  {
    slug: 'taavi-horila',
    name: 'Taavi Horila',
    photo: '/images/team/Taavi-Horila.jpg',
    bio: 'Taavi Horila on integraatioarkkitehti, YTM, Seinäjoen Vihreät ry. puheenjohtaja ja Vihreiden puoluevaltuuston jäsen. Hänelle politiikan tärkeimpänä tavoitteena on planeetan säilyminen elinkelpoisena ja tämän eteen Horila haluaa oman osansa tehdä. Markkinatalous on paras mahdollinen tapa ratkoa resurssien jako oikeudenmukaisesti. Oikeilla reunaehdoilla ja ulkoisvaikutusten hinnoittelulla markkinatalous on myös kaikille reilu tapa ratkaista ilmasto- ja luontokriisi.',
    links: [
      { type: 'bluesky', url: 'https://bsky.app/profile/taavihorila.bsky.social' },
      { type: 'threads', url: 'https://www.threads.com/@taavihorila' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/taavihorila/' },
    ],
  },
  {
    slug: 'timo-huhta',
    name: 'Timo Huhta',
    photo: '/images/team/Timo-Huhta.jpg',
    bio: 'Timo Huhta on energiatekniikan diplomi-insinööri, rakennuttajakonsultti, väitöskirjatutkija ja vantaalainen varavaltuutettu. Huhdan tavoitteena on rakentaa taloudellisesti kestävää ja oikeudenmukaista hyvinvointivaltiota, mihin kuuluvat kestävä kasvu ja kaupunkikehitys, menestyvät yritykset, elinvoimaiset ja viihtyisät asuinalueet sekä panostukset lasten ja nuorten hyvinvointiin. Poliittisissa teemoissa näkyvät erityisesti maa- ja asuntopolitiikka, kaupunkikehitys sekä energia- ja ilmastopolitiikka.',
    links: [
      { type: 'website', url: 'https://www.timohuhta.fi', label: 'timohuhta.fi' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/timohuhta' },
      { type: 'instagram', url: 'https://www.instagram.com/timo.huhta/' },
      { type: 'facebook', url: 'https://www.facebook.com/huhtatimo' },
    ],
  },
  {
    slug: 'anna-jaakola',
    name: 'Anna Jaakola',
    photo: '/images/team/Anna-Jaakola.jpg',
    bio: 'Anna Jaakola on pyhtääläinen naistentautien ja synnytysten erikoislääkäri, yrittäjä ja pienen pojan äiti. Hänelle tärkeää on politiikka, jossa tulevien sukupolvien hyvinvointi asetetaan lyhytnäköisen edun edelle ja jossa ihmisyys, empatia ja sivistys nähdään yhteiskunnan vahvuuksina. Anna ajattelee, että elinvoimainen talous rakentuu vakaalle yhteiskunnalle, koulutukselle, tutkimukselle ja luonnon kantokyvyn kunnioittamiselle. Politiikassa Annaa motivoivat erityisesti lasten ja nuorten hyvinvointi, luonnonsuojelu, inhimillisyys ja sosiaalinen oikeudenmukaisuus, tiedeperustainen päätöksenteko sekä tulevaisuuteen katsova, vastuullinen markkinatalous.',
    links: [
      { type: 'instagram', url: 'https://www.instagram.com/karhuryhma_' },
      { type: 'facebook', url: 'https://www.facebook.com/anna.jaakola.1' },
    ],
  },
  {
    slug: 'ville-veikko-karttunen',
    name: 'Ville-Veikko Karttunen',
    photo: '/images/team/Ville-Veikko-Karttunen.jpg',
    bio: 'Ville-Veikko Karttunen on talousjohtaja, sijoittaja, ja Vihreiden puolueaktiivi. Kahden lapsen isänä, Ville-Veikko pitää ehdottoman tärkeänä, että politiikkaa tehdään pitkäjänteisesti tulevien, eikä lähtevien sukupolvien ehdoilla. Ilmastokriisi on se korko, jota luonto meiltä veloittaa pitkään jatkuneen pikavippikierteen jälkeen. Nyt on aika lyhentää pääomia, eikä jatkaa velaksi elämistä. Muuten ulosotossa meiltä kaikilta lähtee koti.',
    links: [
      { type: 'website', url: 'https://villekarttunen.fi', label: 'villekarttunen.fi' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/veksi/' },
    ],
  },
  {
    slug: 'samuli-koivulahti',
    name: 'Samuli "Sako" Koivulahti',
    photo: '/images/team/Samuli-Koivulahti.jpg',
    candidateBadge: 'Ehdolla eduskuntavaaliehdokkaaksi Varsinais-Suomessa',
    bio: 'Samuli "Sako" Koivulahti on turkulainen yksinyrittäjä, luovan alan ammattilainen ja kolmen lapsen isä. Hän tuo vihreään politiikkaan suoraa puhetta ja yksinyrittäjän arkirealismia myös kulttuurialojen puolelta. Sakolle on selvää, että hyvinvointivaltio pelastetaan vain työllä ja yrittämisellä, mutta ei luonnon tai tulevien sukupolvien kustannuksella.\n\nPolitiikassa Sako taistelee reilun markkinatalouden ja erityisesti yksin- ja pienyrittäjien aseman puolesta. Hän haluaa purkaa yrittämistä jarruttavat byrokratiahimmelit, kuten epäoikeudenmukaisen YEL-järjestelmän, leikata kilpailua vääristäviä yritystukia. Vihreät on Sakolle luonteva koti, koska puolue kykenee yhdistämään talousrealismin ylisukupolviseen vastuuseen, ilman perinteisten oikeistopuolueiden luutunutta eturyhmäpolitikointia.',
    links: [
      { type: 'website', url: 'https://samulikoivulahti.fi/', label: 'samulikoivulahti.fi' },
      { type: 'threads', url: 'https://www.threads.com/@samulikoivulahti' },
      { type: 'instagram', url: 'https://www.instagram.com/samulikoivulahti/' },
    ],
  },
  {
    slug: 'tero-koskinen',
    name: 'Tero Koskinen',
    photo: '/images/team/Tero-Koskinen.jpg',
    candidateBadge: 'Eduskuntavaaliehdokas Uudellamaalla',
    bio: 'Tero Koskinen työskentelee valmiuspäällikkönä pelastuslaitoksella ja hyvinvointialueella. Koskisen erityisosaamista ovat yritysten, sosiaali- ja terveystoimen sekä pelastuslaitosten valmius ja varautuminen. Keskeisiä teemoja Koskisella ovat turvallisuus, luonto ja ympäristö sekä liikkuva elämäntapa.',
    links: [
      { type: 'bluesky', url: 'https://bsky.app/profile/terokoskinen.bsky.social' },
      { type: 'threads', url: 'https://www.threads.com/@aijavihrea' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/tero-koskinen-3188b184' },
      { type: 'instagram', url: 'https://www.instagram.com/aijavihrea/' },
    ],
  },
  {
    slug: 'jaakko-kyro',
    name: 'Jaakko Kyrö',
    photo: '/images/team/Jaakko-Kyrö.jpg',
    bio: 'Jaakko Kyrö on mäntsäläläinen perheenisä, ohjelmistokehittäjä ja pelimanni. Arki kuluu palkkatyön lisäksi kunnallispolitiikassa Mäntsälän kunnanvaltuuston varajäsenenä sekä teknisen lautakunnan jäsenenä sekä kulttuurin saralla suomalaisen kansanmusiikin edistämisen parissa. Vihreät on valikoitunut Jaakon puolueeksi ensisijaisesti markkinamyönteisyyden, eturyhmäpolitikoinnin puutteen sekä tietoon perustuvan politiikan takia.',
    links: [
      { type: 'website', url: 'https://www.jaakkokyro.fi', label: 'jaakkokyro.fi' },
      { type: 'instagram', url: 'https://instagram.com/jaakkokyrovihreat' },
    ],
  },
  {
    slug: 'tuuli-kousa',
    name: 'Tuuli Kousa',
    photo: '/images/team/Tuuli-Kousa.jpg',
    bio: 'Tuuli Kousa on helsinkiläinen kaupunginvaltuutettu, kaupunginhallituksen jäsen, juristi ja yrittäjä. Tuulilla on pitkä kokemus yrityselämän johtotehtävistä viestinnän, vastuullisuuden ja yhteiskuntasuhteiden parissa. Politiikassa hän on toiminut aiemmin Helsingin kaupunginvaltuuston puheenjohtajana, kehitys- ja omistajaohjausministeri Pekka Haaviston erityisavustajana ja Vihreiden talouspoliittisen työryhmän puheenjohtajana.\n\nTuulin politiikan peruskiviä ovat vastuullinen markkinatalous, yhdenvertaisuus, koulutus, kulttuuri ja luonnon monimuotoisuus. Niiden varaan voidaan rakentaa sivistynyt, vauras ja sosiaalisesti oikeudenmukainen yhteiskunta, jossa jokaisella on näköaloja ja joka kannustaa tekemään, uskaltamaan ja yrittämään.',
    links: [
      { type: 'website', url: 'https://www.tuulikousa.com', label: 'tuulikousa.com' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/tuuli-kousa/' },
      { type: 'instagram', url: 'https://www.instagram.com/tuulikousa/' },
    ],
  },
  {
    slug: 'arttu-laitinen',
    name: 'Arttu Laitinen',
    photo: '/images/team/Arttu-Laitinen.jpg',
    candidateBadge: 'Ehdolla eduskuntavaaliehdokkaaksi Varsinais-Suomessa',
    bio: 'Arttu Laitinen on kahden lapsen isä, teknologian ja myynnin ammattilainen (DI, UTU) sekä aktiivinen reservin upseeri. Arttu ajaa markkinaehtoista, energiaomavaraista ja koulutukseen panostavaa Suomea, jossa panokset laitetaan eläkeläisten sijaan lapsiin, nuoriin ja tulevaisuuteen. Arttu toimii Turun kaupunginvaltuuston varavaltuutettuna, Turun Vihreiden valtuustoryhmän varapuheenjohtajana ja Turun lasten ja nuorten palveluiden lautakunnan jäsenenä.',
    links: [
      { type: 'website', url: 'https://arttulaitinen.fi', label: 'arttulaitinen.fi' },
      { type: 'threads', url: 'https://www.threads.com/@4rttu.laitinen' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/arttu-laitinen-75945a63/' },
      { type: 'instagram', url: 'https://www.instagram.com/4rttu.laitinen/' },
      { type: 'x', url: 'https://x.com/4rttuLaitinen' },
    ],
  },
  {
    slug: 'lauri-lavanti',
    name: 'Lauri Lavanti',
    photo: '/images/team/Lauri-Lavanti.jpg',
    bio: 'Lauri Lavanti on Kirkkonummen kunnanvaltuutettu, valtuustoryhmän puheenjohtaja ja johtava ohjelmistokehittäjä pankissa. Hän on valmistunut diplomi-insinööriksi Aalto-yliopistosta ja hänellä on neljä lasta. Laurin isä toimi pitkään Kokoomuksen kunnanvaltuutettuna Kirkkonummella. Laurin tavoitteena on digitaalisesti itsenäinen Suomi, jossa talous, sivistys ja vapaus toimivat yhdessä tekoälyn aikakaudella.',
    links: [
      { type: 'website', url: 'https://lavanti.fi/fi/', label: 'lavanti.fi' },
      { type: 'mastodon', url: 'https://mastodon.social/@laurilavanti' },
      { type: 'bluesky', url: 'https://bsky.app/profile/lauri.lavanti.fi' },
      { type: 'threads', url: 'https://www.threads.com/@laurilavanti' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/laurilavanti/' },
      { type: 'instagram', url: 'https://www.instagram.com/laurilavanti/' },
      { type: 'facebook', url: 'https://www.facebook.com/laurilavanti' },
      { type: 'tiktok', url: 'https://www.tiktok.com/@laurilavanti' },
    ],
  },
  {
    slug: 'onni-jonatan-matilainen',
    name: 'Onni-Jonatan Matilainen',
    photo: '/images/team/Onni-Jonatan-Matilainen.jpg',
    bio: 'Onni-Jonatan Matilainen on varakaupunginvaltuutettu Oulusta, puoluevaltuuston varajäsen ja taloustieteen maisteriopiskelija. Politiikassa hänen keskeisiin teemoihin kuuluu muiden muassa kestävä kehitys, ilmastopolitiikka, elinkeinopolitiikka ja uudistava sosiaalipolitiikka.',
    links: [
      { type: 'linkedin', url: 'https://linkedin.com/in/ojmatilainen' },
      { type: 'instagram', url: 'https://instagram.com/ojmatilainen' },
    ],
  },
  {
    slug: 'kalle-matsinen',
    name: 'Kalle Matsinen',
    photo: '/images/team/Kalle-Matsinen.jpg',
    bio: 'Kalle Matsinen on tamperelainen ravintoloitsija ja humanisti. Matsiselle tärkeitä teemoja ovat reilu ja toimiva markkinatalous, kestävä liikenne- ja kaupunkisuunnittelu, vähemmistöjen osallisuus politiikassa ja oikeuksien toteutuminen.',
    links: [
      { type: 'threads', url: 'https://www.threads.com/@kalakalmari' },
      { type: 'instagram', url: 'https://www.instagram.com/kalakalmari' },
    ],
  },
  {
    slug: 'johanna-muurinen',
    name: 'Johanna Muurinen',
    photo: '/images/team/Johanna-Muurinen.jpg',
    bio: 'Johanna Muurinen on sipoolainen tutkija, dosentti, agronomi ja aloitteleva kuntapoliitikko, jonka politiikkaan lähtemisen motiivina oli varmistaa tutkimustietoon pohjautuvia päätöksiä. Sipoon kunnanvaltuustossa hän on 1. varavaltuutettu, rakennus- ja ympäristövaliokunnan jäsen, kunnanhallituksen varajäsen ja Sipoon Vesi -liikelaitoksen johtokunnassa kunnanhallituksen edustajana. Johanna on kotoisin Porvoosta ja asunut myös Yhdysvalloissa, missä hän näki läheltä mihin arvokonservatiivinen ja tiedettä väheksyvä politiikka johtaa. Työkseen Johanna tutkii ihmiskunnan kohtalonkysymyksiä ja hänen poliittisena tavoitteenaan on ohjata päätöksiä siihen suuntaan, että maailma olisi tuleville sukupolville parempi paikka.',
    links: [
      { type: 'bluesky', url: 'https://bsky.app/profile/jmuurine.bsky.social' },
      { type: 'facebook', url: 'https://www.facebook.com/johanna.muurinen' },
    ],
  },
  {
    slug: 'lauri-nevanpera',
    name: 'Lauri Nevanperä',
    photo: '/images/team/Lauri-Nevanperä.jpg',
    bio: 'Lauri Nevanperä on johtava tekoälyinsinööri, Tampereen kaupunginvaltuutettu, yhdyskuntalautakunnan jäsen ja Pirkanmaan maakuntavaltuutettu. Hänen ydinalojansa ovat talous, teknologia, liikenne ja kaupunkisuunnittelu. Laurin mielestä markkinamekanismi on tehokkain tunnettu tapa allokoida resursseja, mutta markkinatalous ei ole moraalinen voima. Tästä syystä tarvitaan vapaat markkinat, ja vahva sosiaaliturva. Vahva talous, lämmin sydän.',
    links: [
      { type: 'website', url: 'https://www.laurinevanpera.fi', label: 'laurinevanpera.fi' },
      { type: 'threads', url: 'https://www.threads.com/@laurinevanpera' },
      { type: 'instagram', url: 'https://www.instagram.com/laurinevanpera/' },
      { type: 'facebook', url: 'https://www.facebook.com/profile.php?id=61568159661357' },
      { type: 'youtube', url: 'https://www.youtube.com/@LauriNevanpera/videos' },
      { type: 'reddit', url: 'https://www.reddit.com/user/wombbu' },
    ],
  },
  {
    slug: 'olli-pekka-paasivirta',
    name: 'Olli-Pekka Paasivirta',
    photo: '/images/team/Olli-Pekka-Paasivirta.jpg',
    bio: 'Olli-Pekka Paasivirta on kauppatieteiden maisteri ja varakaupunginvaltuutettu Espoosta. Hän on työskennellyt ekonomistina niin elinkeinoelämässä kuin julkisella sektorilla. Hän ajattelee, että markkinatalous on paras työkalu aikamme suurten ongelmien ratkaisemiseksi, ja Vihreät ymmärtää tämän Suomen puoluekentästä kaikista parhaiten.',
    links: [
      { type: 'linkedin', url: 'https://www.linkedin.com/in/olli-pekka-paasivirta-6ab450b1/' },
      { type: 'instagram', url: 'https://www.instagram.com/oppaasivirta/' },
    ],
  },
  {
    slug: 'vilju-ak-parviainen',
    name: 'Vilju A.K. Parviainen',
    photo: '/images/team/Vilju-A.K.-Parviainen.jpg',
    bio: 'Vilju on abivuodelle tallusteleva lukiolainen sekä avoimen yliopiston oikeustieteiden opiskelija. Hän toimii Vihreiden Nuorten ja Opiskelijoiden liittohallituksessa talouspolitiikan vastaavana sekä Vihreiden ulko- ja turvallisuuspoliittisessa asiantuntijatyöryhmässä. Viljun talousfilosofian ytimenä toimii kestävä talous, kunnossa oleva kokonaisturvallisuus ja panostettu koulutus sen pohjana. Perustulo, tasa-arvo, hyöty- ja haittaverotus ovat avaimet vapautuneeseen elämään.',
    links: [
      {
        type: 'linkedin',
        url: 'https://www.linkedin.com/in/vilju-allen-kira-parviainen-96096b314',
      },
      { type: 'instagram', url: 'https://www.instagram.com/viljuakp' },
      { type: 'tiktok', url: 'https://www.tiktok.com/@viljuakp' },
    ],
  },
  {
    slug: 'ilari-putkonen',
    name: 'Ilari Putkonen',
    photo: '/images/team/Ilari-Putkonen.jpg',
    bio: 'Ilari Putkonen on ekonomi, johtava IT-asiantuntija ja kuntapoliitikko Tampereelta. Politiikassa Putkonen on kiinnostunut erityisesti reilun markkinatalouden edistämisestä, talouskasvun edellytysten luomisesta ja sukupolvien välisen oikeudenmukaisuuden vaalimisesta. Suvaitsevaisuus, jakamaton ihmisarvo ja luonnon kantokyvystä huolehtiminen muodostavat arvopohjan Putkosen poliittiselle toiminnalle.',
    links: [
      { type: 'website', url: 'https://ilariputkonen.fi/', label: 'ilariputkonen.fi' },
      { type: 'threads', url: 'https://www.threads.com/@ilariputkonen' },
    ],
  },
  {
    slug: 'juho-salmi',
    name: 'Juho Salmi',
    photo: '/images/team/Juho-Salmi.jpg',
    bio: 'Juho on johtamisen tutkija, neuvonantaja ja puhuja, joka tekee satiiria ja standupia työelämän toinen toistaan absurdimmista ilmiöistä. Hänen mielestään suomalaista johtamista ja politiikkaa vaivaavat samat ilmiöt: visioton uudistumiskyvyttömyys, lyhytnäköinen kotiinpäin vetäminen sekä puheiden ja tekojen ristiriita. Markkinavihreys purkaa uudistumista jarruttavat yritystuet, lopettaa ympäristöä tuhoavan vapaamatkustamisen ja laittaa ulkoisvaikutuksille hinnan, joka sitoo teot puheisiin. Näin syntyvät kestävät markkinat vihreälle kasvulle ja uusille aluille.',
    links: [
      { type: 'linkedin', url: 'https://www.linkedin.com/in/juhosalmi/' },
      { type: 'threads', url: 'https://www.threads.com/@juhosalmi' },
      { type: 'instagram', url: 'https://www.instagram.com/juhosalmi/' },
      { type: 'facebook', url: 'https://www.facebook.com/jtsalmi' },
      { type: 'tiktok', url: 'https://www.tiktok.com/@salmijuho' },
    ],
  },
  {
    slug: 'susanna-sankala',
    name: 'Susanna Sankala',
    photo: '/images/team/Susanna-Sankala.jpg',
    candidateBadge: 'Ehdolla eduskuntavaaliehdokkaaksi Varsinais-Suomessa',
    bio: 'Susanna Sankala on jatkuvan oppimisen asiantuntija LUTin teknillisen yliopiston tohtorikoulusta (VTM), koulutusalan yrittäjä ja puhuja Turusta. Susannan pääteemoja vaaleissa ovat koulutus, turvallisuus ja tulevaisuus. Hän on mukana erityisesti tekoälyn, teknologian ja yrittäjyyden verkostoissa. Hän on Vihreiden koulutuspoliittisen asiantuntijatyöryhmän puheenjohtaja sekä Turun Seudun Vihreiden naisten puheenjohtaja.',
    links: [
      { type: 'threads', url: 'https://www.threads.com/@susannasankala' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/susannasankala/' },
      { type: 'instagram', url: 'https://www.instagram.com/susannasankala/' },
    ],
  },
  {
    slug: 'susanna-sielo',
    name: 'Susanna Sielo',
    photo: '/images/team/Susanna-Sielo.jpg',
    candidateBadge: 'Eduskuntavaaliehdokas Uudellamaalla',
    bio: 'Susanna Sielo on Espoon kaupunginvaltuutettu, markkinavihreä talousmimmi, strategiaan erikoistunut ekonomi sekä rationaalinen ääni politiikassa. Työkseen hän konsultoi yrityksiä teknologian ja tekoälyn kysymyksissä. Espoossa Susanna toimii mm. Yritysten ja yrittäjyyden ohjausryhmässä ja edistää kasvuyritysten edellytyksiä ja yrittäjyyskasvatusta kaikille nuorille. Koulutustason nostaminen, tasa-arvon edistäminen ja nuorten syrjäytymisen estäminen ovat Susannalle tärkeitä teemoja, ja näitä tavoitteita hän on myös saanut läpi valtuustossa. Entisenä Kokoomuksen äänestäjänä Susanna vaihtoi Vihreisiin, kun Kokoomus ei enää vastannut hänen käsitystään tietoon pohjautuvasta, uudistavasta ja resurssiviisaasta politiikasta. Susanna haluaa mieluummin rakentaa politiikkaa, joka yhdistää uudistuvan talouden, luonnon elpymisen ja vapaan sivistysyhteiskunnan. Susannan sydän ei ole oikealla vaan se on lämmin, empaattinen ja vihreä.',
    links: [
      { type: 'website', url: 'https://susannasielo.fi/', label: 'susannasielo.fi' },
      { type: 'threads', url: 'https://www.threads.com/@susannasielo' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/susanna-sielo/' },
      { type: 'instagram', url: 'https://www.instagram.com/susannasielo' },
      { type: 'facebook', url: 'https://www.facebook.com/profile.php?id=61567333831277' },
      { type: 'tiktok', url: 'https://www.tiktok.com/@susannasielo' },
    ],
  },
  {
    slug: 'osmo-soininvaara',
    name: 'Osmo Soininvaara',
    photo: '/images/team/Osmo-Soininvaara.jpg',
    bio: 'Osmo Soininvaara on tietokirjailija ja politiikan eläkeläinen.',
    links: [{ type: 'website', url: 'https://www.soininvaara.fi', label: 'soininvaara.fi' }],
  },
  {
    slug: 'mikko-sarela',
    name: 'Mikko Särelä',
    photo: '/images/team/Mikko-Särelä.jpg',
    bio: 'Mikko Särelä on tietoverkkotekniikan tohtori Aalto-yliopistosta, Lisää kaupunkia -liikkeen perustaja ja aiemmassa elämässä Helsingin kuntapolitiikassa aktiivinen. Mikko toimi myös Vihreiden kaupunkipoliittisen työryhmän puheenjohtajana kaudella 2022-2023. Mikko on työskennellyt uransa varrella startupissa, yliopistossa, kansainvälisessä suuryrityksessä ja järjestökentällä. Markkinat ovat erinomainen väline tuottaa hyvinvointia, jakaa niukkoja resursseja ja vähentää luontohaittoja. Ilmastopäästöjen päästökauppa on paras keksitty menetelmä vähentää päästöjä.',
    links: [],
  },
  {
    slug: 'samuel-tammekann',
    name: 'Samuel Tammekann',
    photo: '/images/team/Samuel-Tammekann.jpg',
    bio: 'Samuel Tammekann on Eurooppalainen Suomi ry:n vt. toiminnanjohtaja, erityisasiantuntija ja yhteiskuntahistorian opiskelija. Kokoomusnuorten 2. varapuheenjohtajanakin toiminut ja vihreisiin siirryttyään monissa kampanjoissa tiiviisti mukana ollut Tammekann haluaa olla laatimassa tämän vuosisadan paineet kestävää avointa yhteiskuntaa ja ekososiaalista markkinataloutta, jossa yksilönvapaus, oikeudenmukaisuus ja ekologinen kantokyky kulkevat käsi kädessä. Erityisesti Tammekannia kiinnostaa moniarvoisen demokratian kestävyys teknologisen murroksen ja monikriisien aikakaudella.',
    links: [
      { type: 'threads', url: 'https://www.threads.com/@stammekann' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/samueltammekann' },
      { type: 'instagram', url: 'https://www.instagram.com/stammekann' },
      { type: 'facebook', url: 'https://www.facebook.com/stammekann' },
    ],
  },
  {
    slug: 'eeva-ylikoski',
    name: 'Eeva Ylikoski',
    photo: '/images/team/Eeva-Ylikoski.jpg',
    bio: 'Eeva Ylikoski on luokanopettaja opiskelija Itä-Suomen Yliopistosta. Hän toimii ylioppilaskunnan hallituksessa sosiaalipolitiikan sektorilla ja Savo-Karjalan vihreiden nuorten ja opiskelijoiden hallituksen vara-puheenjohtajana. Tämän lisäksi Eeva toimii Joensuun vammaisneuvostossa. Eevalle on tärkeää politiikka, jossa erityisesti vähempi osasia autetaan ja tuetaan. Luontojärjestöt ovat myös Eevalle tärkeitä ja onkin siellä aloittanut oman poliittisen uransa. Eeva on mukana vihreissä, koska hänelle luonto ja eläimet ovat erityisen lähellä sydäntä. Hänestä myös vahva valtio auttaa heikompia pärjäämään ja pysymään mukana yhteiskunnassa.',
    links: [],
  },
]

people.forEach((person, index) => {
  const frontmatter = [
    '---',
    'locale: fi',
    `name: ${JSON.stringify(person.name)}`,
    `order: ${index + 1}`,
    `photo: ${JSON.stringify(person.photo)}`,
    person.candidateBadge ? `candidateBadge: ${JSON.stringify(person.candidateBadge)}` : null,
    'links:',
    ...person.links.map(
      (l) =>
        `  - type: ${l.type}\n    url: ${JSON.stringify(l.url)}` +
        (l.label ? `\n    label: ${JSON.stringify(l.label)}` : ''),
    ),
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n')

  writeFileSync(join(OUT_DIR, `${person.slug}.fi.md`), frontmatter + person.bio + '\n')
})

console.log(`Wrote ${people.length} team entries to ${OUT_DIR}`)
