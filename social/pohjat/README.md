# Markkinavihreät – somepohjat

Pohjat omiin somepostauksiin Markkinavihreät-brändin alla. Ilme on sama kuin
Yrittäjän päivän karusellissa (`social/yrittajan-paiva`).

## Tiedostot

| Tiedosto                           | Koko               | Käyttö                                                |
| ---------------------------------- | ------------------ | ----------------------------------------------------- |
| `markkinavihreat-postaus-4x5.pptx` | 1080 × 1350 (4:5)  | Instagram-/Facebook-/LinkedIn-karuselli tai yksi kuva |
| `markkinavihreat-tarina-9x16.pptx` | 1080 × 1920 (9:16) | Instagram-/Facebook-tarina, TikTok-kansikuva          |
| `brandikit/`                       | PNG                | Logot ja ikonit tummalle ja vaalealle pohjalle        |

Postauspohjan diat:

1. **Kansi** (tumma) – aihe, iso otsikko korostussanalla, alaotsikko, pyyhkäisynuoli.
2. **Sisältödia** (vaalea) – ikoni, numero, otsikko, kolme ongelmaa ja vihreä
   ”Markkinavihreät haluavat” -ratkaisulaatikko.
3. **Sisältödia** (vihertävä) – sama vaihtoehtoisella taustalla; vuorottele näitä.
4. **Sitaatti** – oma kuva, lainaus, nimi ja rooli. Toimii myös yksittäisenä kuvana.
5. **Lopetus** (tumma) – loppuviesti, linkki ja Vihreät-logo.
6. **Työkalupakki** (piilotettu) – ikonit, logot ja värit kopioitavaksi.

Tarinapohjassa ovat kansi, sitaatti ja lopetus. Niissä ylä- ja alareunaan on
jätetty tilaa sovelluksen omille painikkeille.

## Näin teet postauksen

1. **Asenna fontti:** Hanken Grotesk (ilmainen) osoitteesta
   <https://fonts.google.com/specimen/Hanken+Grotesk>. Tarvitset leikkaukset
   _SemiBold_ ja _ExtraBold_. Google Slidesissa fontti löytyy valmiiksi
   (Fontit → Lisää fontteja → Hanken Grotesk).
2. **Avaa pohja** PowerPointissa, Keynotessa tai Google Slidesissa
   (Drive → Uusi → Tiedoston lataus → avaa Google Slidesilla).
3. **Vaihda kaikki [hakasulkeissa] olevat tekstit.** Poista hakasulkeet.
4. **Monista sisältödia** (Ctrl/Cmd + D) jokaista kohtaa varten ja päivitä
   numero ja sivunumero (esim. 2 / 5). Poista diat, joita et tarvitse.
5. **Vaihda kuva** sitaattidiaan: poista vihreä laatikko ja lisää oma kuva
   samaan kohtaan neliöksi rajattuna.
6. **Poista piilotettu työkalupakki-dia** ja vie diat kuviksi:
   - PowerPoint: Tiedosto → Vie → PNG → Kaikki diat
   - Keynote: Arkisto → Vie → Kuvat → PNG
   - Google Slides: Tiedosto → Lataa → PNG (dia kerrallaan)

Jokaisen dian muistiinpanoissa on lyhyt ohje.

## Ilme lyhyesti

- **Värit:** metsä `#122C12` (tumma tausta), kerma `#EFEEE9` (vaalea tausta),
  vihertävä `#DDE3D4`, brändivihreä `#006845`, kirkas vihreä `#6EB82A`
  (korostus tummalla), terra `#C95B3D` (ongelmat, ✕-merkit). Älä lisää muita värejä.
- **Fontti:** ExtraBold otsikoihin ja korostuksiin, SemiBold muuhun tekstiin.
- **Logo:** tummalla pohjalla valkoinen, vaalealla vihreä. Älä venytä, rajaa
  tai värjää logoa muuksi.
- **Teksti:** yksi ajatus per dia, lyhyet lauseet. Korosta vain yksi sana
  tai sanapari kirkkaalla vihreällä.
- **Sisältö:** kirjoita vain asioita, jotka ovat markkinavihreiden linjassa
  tai omia näkemyksiäsi omalla nimelläsi. Tarkista luvut ja lähteet.

## Pohjien päivittäminen (ylläpitäjälle)

Pohjat generoidaan skriptillä, joka käyttää sivuston fontteja ja Yrittäjän
päivän karusellin ikoneita:

```bash
npm i --no-save pptxgenjs sharp && node social/pohjat/build.cjs
```
