# Suunnitelma: avaus "Tehdään työstä _aina_ kannattavaa"

> Työversio keskustelua varten. Ei julkaistava sellaisenaan. Poistetaan tai siirretään pois
> repositoriosta ennen kuin haara yhdistetään `main`iin.

## 1. Mitä avauksella halutaan sanoa

**Ydinviesti yhdellä lauseella:** Jos saat toimeentulotukea ja teet muutaman tunnin töitä, sinulle
ei jää niistä tunneista mitään. Hyvätuloiselle samasta työstä jää käteen noin puolet. Se on väärin,
ja me markkinavihreät haluamme korjata sen.

Kolme asiaa, jotka lukijan pitää muistaa sivulta:

1. **Ongelma:** pienituloisen työtunti voi olla hänelle arvoton – koko palkka menee tuen
   pienenemiseen.
2. **Kenen puolella olemme:** niiden ihmisten, jotka haluavat tehdä töitä ja parantaa asemaansa.
   Vika on järjestelmässä, ei ihmisissä.
3. **Ratkaisu:** perustulo (ja sitä tukevat korjaukset), joilla jokainen tehty tunti näkyy aina
   omassa lompakossa.

## 2. Kieli ja sävy

- **Suorapuheinen ja konkreettinen.** Puhutaan euroista, tunneista ja ihmisistä, ei
  järjestelmistä. "Teet neljän tunnin vuoron. Sinulle jää siitä 0 euroa."
- **Ei ammattitermejä otsikoissa eikä ydintekstissä.** "Efektiivistä marginaaliveroa" ei käytetä
  lainkaan pääteksti­osassa. Sen tilalla: _"Kuinka paljon jokaisesta ansaitusta eurosta jää
  sinulle?"_ tai _"Mitä tunnin työstä jää käteen?"_. Termi voidaan mainita kerran
  lisätietolaatikossa ("Asiantuntijat kutsuvat tätä efektiiviseksi marginaaliveroksi"), jotta
  aiheesta kiinnostunut löytää lisää tietoa.
- **Myös "kannustinloukku" vältetään pääviestissä.** Sana kuulostaa siltä, että ongelma olisi
  ihmisten kannustimissa tai laiskuudessa. Puhutaan mieluummin siitä, että _järjestelmä rankaisee
  työnteosta_ tai että _työ ei kannata_.
- **Lyhyet virkkeet, yksi asia kappaleessa.** Tavoitteena selkokielen lähellä oleva yleiskieli –
  ymmärrettävä ilman taustatietoja, mutta ei lapsellinen.
- **Lukija on se ihminen, josta puhutaan.** Teksti puhuttelee sinä-muodossa ja on näiden ihmisten
  puolella: ei syyllistetä tuensaajia eikä hyvätuloisia. Hyvätuloinen on vertailukohta, ei vihollinen
  ("Sinulle jää käteen vähemmän kuin johtajalle samasta työstä.").
- **Rehellisyys luvuissa.** Jokainen luku perustuu laskelmaan, jonka lähteet näytetään avattavassa
  "Kuinka tämä on laskettu?" -osiossa (sama `[laskelma: …]`-rakenne kuin ruoan alv -ehdotuksessa).
  Kärjistetään viestiä, ei lukuja.
- **Me-muoto:** "Me markkinavihreät haluamme…", "Meidän mielestämme…".

Esimerkkejä sävystä (luonnoksia, ei lopullista tekstiä):

> Kuvittele, että teet lauantaina neljän tunnin vuoron kaupan kassalla. Palkkaa kertyy 56 euroa.
> Kun saat toimeentulotukea, Kela pienentää tukeasi täsmälleen saman verran kuin palkkasi kasvoi.
> Lopputulos: tuntien jälkeen sinulla on tilillä yhtä paljon rahaa kuin jos olisit jäänyt kotiin.

> Tämä ei ole sattumaa, eikä se ole kenenkään tuensaajan vika. Säännöt on kirjoitettu niin.

## 3. Miten ongelma visualisoidaan

Pääperiaate: **lukijan pitää ymmärtää ongelma kuvasta ennen kuin hän lukee tekstiä.** Kaksi
visualisointia, joista ensimmäinen on pakollinen ja toinen vahvistaa sitä.

### Kuva 1: "Sama työ, sama palkka – eri lopputulos" (pääkuva, heti ingressin jälkeen)

Kaksi henkilöä rinnakkain. Molemmat tekevät **saman 4 tunnin vuoron samalla tuntipalkalla**, eli
ansaitsevat saman summan. Kummallekin piirretään palkki, joka jakautuu kahteen osaan:

```
                     Palkka 56 €
Hyvätuloinen     [██████████████|░░░░░░░░░░░░░░]   jää käteen ~28 €
                  käteen          verot

Toimeentulo-     [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   jää käteen 0 €
tuen saaja        verot + tuen pieneneminen
```

- Iso numero kummankin kohdalla: **"Jää käteen: 28 €"** ja **"Jää käteen: 0 €"**.
- Värit: "sinulle" vihreällä (sivuston korostusväri), "menee muualle" harmaalla. Pienituloisen
  palkki on kokonaan harmaa – se on koko viesti.
- Sama luku muotoiltuna lauseeksi kuvan alla: _"Samasta työstä hyvätuloiselle jää noin puolet,
  toimeentulotuen saajalle ei mitään."_
- Vertailu tehdään tarkoituksella samalla tuntipalkalla, jotta ero johtuu vain tukijärjestelmästä,
  ei palkasta. Lisäksi voidaan näyttää hyvätuloisen oma, isompi tuntipalkka (esim. 40 €/h, josta jää
  ~20 €), jolloin ero on vielä räikeämpi: _hänelle jää yhdestä tunnista enemmän kuin
  toimeentulotuen saajalle koko päivästä._

Toteutus: uusi `src/components/charts/…Chart.astro` + laskentamoduuli `src/lib/charts/…ts`, samaan
tapaan kuin `RuokaostostukiAlvChart`. Upotetaan tekstiin `[kuvaaja: …]`-merkinnällä. Staattinen
SVG, toimii ilman JavaScriptiä, saavutettava (`<title>`/`<desc>`), kolmella kielellä.

### Kuva 2: "Tee 0 tai 40 tuntia kuussa – käteen jää sama" (viivakaavio)

- Vaaka-akselilla työtunnit kuukaudessa (0–160), pystyakselilla rahaa käytettävissä kuukaudessa.
- Toimeentulotuen saajan viiva on **täysin vaakasuora** pitkän matkaa: tunteja tulee lisää, mutta
  rahaa ei. Vasta kun palkka ylittää tuen tason, viiva alkaa nousta.
- Vertailuksi viiva, jossa jokaisesta tunnista jää aina osa käteen (perustulomallin mukaan
  laskettuna) – se nousee heti ensimmäisestä tunnista.
- Tasainen osuus nimetään kuvassa: **"Nämä tunnit tehdään ilmaiseksi"**.
- Mahdollinen lisä: liukusäädin "Montako tuntia teet kuussa?", joka näyttää molempien mallien
  luvut. Tämä vaatii JavaScriptiä, joten perusversio on staattinen ja säädin on lisäkerros. Päätetään
  myöhemmin, tarvitaanko säädintä.

### Somekuvat

Samasta laskelmasta tehdään karuselli (kuten varallisuustili-ehdotuksessa): kansi → kaksi ihmistä
rinnakkain → "0 €" isolla → miksi näin käy → ratkaisu → "Lue lisää: markkinavihreat.fi". Tehdään
vasta, kun teksti ja luvut on lyöty lukkoon.

## 4. Sivun rakenne (luonnos)

Toteutetaan ehdotuksena `src/content/programs/tyosta-aina-kannattavaa.{fi,sv,en}.md`, aluksi
`unlisted: true`, kunnes teksti on hyväksytty.

| Osio                                   | Sisältö                                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hero**                               | Yläotsake esim. "Markkinavihreä avaus". Otsikko "Tehdään työstä / _aina_ kannattavaa" (ks. avoimet kysymykset: kursiivi vs. korostusväri).                                                                                               |
| **Ingressi**                           | 2–3 virkettä: Suomessa on ihmisiä, joille työ ei kannata lainkaan. Se on väärin. Me haluamme korjata sen.                                                                                                                                |
| **Kuva 1**                             | Sama työ, sama palkka – eri lopputulos.                                                                                                                                                                                                  |
| **Mistä on kyse**                      | Selitys arkikielellä: toimeentulotuki pienenee joka eurolla, jonka ansaitset. Siksi muutaman tunnin työ ei näy lompakossa. Laskelma avattavana.                                                                                          |
| **Miksi tämä on iso ongelma**          | Pienet työt ovat usein ensimmäinen askel työelämään: keikka, osa-aikatyö, kesätyö. Juuri ne ensimmäiset askeleet ovat nyt arvottomia. Kuva 2 tähän.                                                                                      |
| **Tilanne on pahentunut**              | Ansiotulojen suojaosat ja vähennykset on viime vuosina poistettu (ks. faktat alla). Ennen pieni osa palkasta sai jäädä käteen; nyt ei jää mitään.                                                                                        |
| **Me olemme näiden ihmisten puolella** | Arvopohja: työ on paras tie parempaan elämään. Jokaisella pitää olla mahdollisuus parantaa asemaansa omalla työllään, jos niin haluaa. Markkinaliberaali perustelu: kun työ kannattaa, ihmiset tekevät sitä – ilman pakkoa ja valvontaa. |
| **Ratkaisu**                           | Perustulo + muut korjaukset (ks. kohta 5).                                                                                                                                                                                               |
| **Usein kysytyt kysymykset**           | Esim. "Eikö tuen pitäisikin pienentyä, kun tienaa?" (Kyllä – mutta vähitellen, ei euro eurosta.) "Eikö tämä ole kallista?" "Mitä vihreät ovat aiemmin esittäneet?" "Miten tämä liittyy ruoan alv -ehdotukseen?"                          |
| **Tekijät / lainaukset**               | Kuten muissa ehdotuksissa (`creators` tai `citations`).                                                                                                                                                                                  |

## 5. Ratkaisut, joita vihreät ovat esittäneet

Pohjana vihreiden sosiaaliturvaohjelma _Kaikkien sosiaaliturva_ (2022) ja puolueen aiemmat kannat.
**Jokainen kohta tarkistetaan alkuperäisestä ohjelmasta ennen julkaisua** – en saanut
vihreat.fi-sivustoa auki tästä ympäristöstä, joten alla oleva perustuu hakutuloksiin.

1. **Perustulo** (pääratkaisu). Vihreiden sosiaaliturvaohjelmassa: verovapaa perusosa 600 €/kk,
   asumisosa asuinkunnan mukaan noin 100–400 €/kk ja lapsikorotus. Perustulo korvaisi
   perustoimeentulotuen ja asumistuet. Ydin meidän viestimme kannalta: **perustulo ei pienene euro
   eurosta, kun teet töitä**, vaan palkan verotus hoitaa tasauksen – jokaisesta tunnista jää aina osa
   käteen. Ohjelman mukaan perustulo voidaan toteuttaa joko kaikille maksettavana tai
   negatiivisena tuloverona.
2. **Ansiotulojen suojaosien palauttaminen** (välitön korjaus, kunnes perustulo on käytössä).
   Vihreät ovat ajaneet suojaosia aiemminkin; vuoden 2014 perustulomallin taustamateriaalissa
   todetaan, että vihreiden vaatimuksesta työmarkkinatukeen ja asumistukeen tuodut suojaosat
   vähensivät kannustinloukkuja. Vihreiden vaihtoehtobudjetissa (2023) on peruttu hallituksen
   työttömyysturvan suojaosaa ja asumistukea koskevia leikkauksia. _TODO: tarkistetaan vihreiden
   tämänhetkinen kanta (vaihtoehtobudjetti 2026) ja koskeeko se myös toimeentulotuen 150 euron
   ansiotulovähennystä._
3. **Negatiivinen tulovero ja tulorekisteri.** Tuet lasketaan automaattisesti ja ajantasaisesti
   tulorekisterin tietojen perusteella, jolloin lyhyt keikka ei katkaise tukea eikä aiheuta
   viikkojen paperisotaa ja odottelua ("byrokratialoukku"). Mainittu vihreiden ohjelmassa perustulon
   toteutustapana. _TODO: tarkistetaan ohjelman tarkka muotoilu._
4. **Linkki ruoan alv -ehdotukseen.** Markkinavihreiden oma
   [Muutetaan ruoan alv perustuloksi](https://markkinavihreat.fi/ehdotukset/ruuan-alv-perustuloksi/) on konkreettinen,
   kustannusneutraali ensiaskel kohti perustuloa. Mainitaan, mutta ei tehdä tästä avauksesta
   alv-avausta.

Avoin kysymys: haluammeko esittää myös jotain omaa, markkinavihreää lisää (esim. tavoitetaso:
"jokaisesta ansaitusta eurosta jää aina vähintään X senttiä käteen")? Selkeä numero olisi hyvä
iskulause, mutta sen pitää perustua laskelmaan.

## 6. Faktapohja (tarkistettava ennen julkaisua)

Hakujen perusteella koottu, lähteet alla. Kaikki luvut lasketaan ja tarkistetaan uudelleen
toteutusvaiheessa, ja laskelma dokumentoidaan sivulle.

- **Toimeentulotuen 150 euron ansiotulovähennys poistettiin** täysi-ikäisiltä
  toimeentulotukiuudistuksessa, Kelan mukaan voimaan 1.3.2026. Ennen sitä osa palkasta (20 %, enintään
  150 €/kk) jätettiin huomiotta tukea laskettaessa. Nyt **nettopalkka pienentää tukea euro eurosta
  ensimmäisestä eurosta alkaen** → käteen jää 0 €. _Tarkistetaan päivämäärä (lähteissä mainitaan sekä
  1.2. että 1.3.2026) ja laista tarkka sanamuoto._
- **Yleisen asumistuen 300 euron ansiotulovähennys poistettiin 1.4.2024.** Kelan mukaan tuki pieneni
  useimmilla työtuloja saavilla noin 100 €/kk.
- **Työttömyysturvan 300 euron suojaosa poistettiin 1.4.2024.** Siitä lähtien jokainen ansaittu euro
  pienentää soviteltua työttömyysetuutta.
- **Hyvätuloisen vertailu:** arviolta noin puolet lisätulosta menee veroihin ja maksuihin esim.
  6 000 €/kk tienaavalla. _Lasketaan tarkasti vuoden 2026 veroasteikoilla (valtion vero, keskimääräinen
  kunnallisvero, työntekijän eläke-, työttömyysvakuutus- ja sairausvakuutusmaksut,
  työtulovähennyksen pieneneminen) ja tarkistetaan Verohallinnon veroprosenttilaskurilla._
- **Esimerkkivuoro:** 4 h × 14 €/h = 56 € brutto. _Tuntipalkka valitaan todellisen
  työehtosopimuksen alimman palkan mukaan (esim. kaupan ala), lähde mainitaan._
- **Hallituksen yleistuki (HE 112/2025):** hallitus valmistelee etuuksien yhdistämistä yleistueksi.
  Eduskunnan tietopalvelun muistion (11/2025) mukaan efektiiviset marginaaliveroasteet voivat olla yli
  70–80 %. _Tarkistetaan uudistuksen tila ja aikataulu – jos se on hyväksytty, avauksen pitää
  käsitellä myös sitä._
- **Rajaus:** toimeentulotuki on viimesijainen tuki, ja kun palkka kasvaa tarpeeksi suureksi,
  ihminen pääsee tuelta pois ja työ alkaa kannattaa. Avauksen kärki on siksi _pienissä töissä ja
  ensimmäisissä tunneissa_ – juuri niissä, joilla töihin paluu yleensä alkaa. Tämä sanotaan sivulla
  rehellisesti, jotta kriitikko ei voi kaataa viestiä yhdellä vastaesimerkillä.

Lähteitä:

- Kela: [Toimeentulotuki uudistuu 2026 (esitysmateriaali)](https://www.kela.fi/documents/d/guest/esitysmateriaali_toimeentulotuen-uudistus_kelafi)
- Kela: [Apua asiakasohjaukseen, kun toimeentulotuki muuttuu 2026](https://www.kela.fi/ajankohtaista/apua-asiakasohjaukseen-kun-toimeentulotuki-muuttuu-2026)
- STT/Kela: [Toimeentulotuen uudistus voimaan](https://www.sttinfo.fi/tiedote/71766190/toimeentulotuen-uudistus-voimaan-muutokset-nakyvat-asiakkaiden-elamassa-lahikuukausina?publisherId=69820426&lang=fi)
- Valtioneuvosto: [Toimeentulotuen kokonaisuudistusta valmistelevan työryhmän muistio](https://valtioneuvosto.fi/-/1271139/toimeentulotuen-kokonaisuudistusta-valmistelevan-tyoryhman-muistio-julkaistu)
- Kela: [Yleinen asumistuki pienenee vuonna 2024…](https://www.kela.fi/ajankohtaista/yleinen-asumistuki-pienenee-vuonna-2024-ja-sen-maksaminen-omistusasuntoihin-paattyy-vuonna-2025)
- Kela: [Sosiaaliturvaan on tulossa monia muutoksia vuodelle 2024](https://www.kela.fi/ajankohtaista/sosiaaliturvaan-on-tulossa-monia-muutoksia-vuodelle-2024)
- Eduskunnan tietopalvelu: [muistio 20250569A (20.11.2025)](https://www.sdp.fi/app/uploads/sites/2/2025/11/sdp_vb_tah20250569a.pdf)
- Vihreät: [Kaikkien sosiaaliturva – vihreiden sosiaaliturvaohjelma (2022, PDF)](https://www.vihreat.fi/wp-content/uploads/2022/02/Sosiaaliturvaohjelma2022.pdf)
- Vihreät: [Vihreä perustulomalli (2014)](https://www.vihreat.fi/ohjelmat/perustulomalli2014/)
- Vihreät: [Vaihtoehtobudjetin laskelmat (2023, PDF)](https://www.vihreat.fi/wp-content/uploads/2023/11/VIHR_VB_20230662A.pdf)

## 7. Toteutusvaiheet

1. **Tämä suunnitelma** → keskustellaan ja lyödään lukkoon viesti, esimerkkihenkilöt ja ratkaisut.
2. **Laskelmat:** laskentamoduuli (`src/lib/charts/…`) yksikkötesteineen, lähteet kommentteihin.
3. **Kuvat:** Kuva 1, sitten Kuva 2. Tarkistetaan puhelimen leveydellä ja tummassa teemassa.
4. **Suomenkielinen teksti** `unlisted: true` -tilassa esikatseluun.
5. **Ruotsin- ja englanninkieliset versiot** (pakollisia jokaiselle sisällölle). Käännökset
   tarkistuttaa ihminen, joka osaa kielen.
6. **Somekarusellin kuvat** ja OG-kuva.
7. **PR ja ihmisen tekemä katselmointi**, sen jälkeen `unlisted` pois.

## 8. Avoimet kysymykset sinulle

1. **Esimerkkihenkilöt:** riittääkö "toimeentulotuen saaja" ja "hyvätuloinen", vai annetaanko
   heille nimet ja ammatit (esim. "Sanna, kaupan kassa" ja "Mikko, IT-johtaja")? Nimet tekevät
   tarinasta helpomman, mutta keksityt henkilöt pitää merkitä selvästi esimerkeiksi.
2. **Hyvätuloisen tulotaso:** onko 6 000 €/kk hyvä "ylempi keskiluokka"?
3. **Tuntipalkka:** käytetäänkö kaupan alan TES-palkkaa vai jotain muuta?
4. **Otsikon korostus:** sana "aina" kursiivilla vai sivuston korostusvärillä (hero-otsikon viimeinen
   rivi on jo korostusvärillä: "Tehdään työstä / **aina kannattavaa**")?
5. **Yläotsake:** "Markkinavihreä avaus", "Markkinavihreät vaativat" vai jokin muu?
6. **Tekijät:** keiden nimissä avaus julkaistaan, ja tuleeko siihen lainauksia?
7. **Kuva 2:n liukusäädin:** tehdäänkö interaktiivinen versio vai riittääkö staattinen kuva?
8. **Oma tavoitetaso:** asetetaanko konkreettinen lupaus ("jokaisesta eurosta jää aina vähintään X
   senttiä")?
