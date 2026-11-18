// Builds the Markkinavihreät social media templates for members who make
// their own posts: two editable PowerPoint decks (feed 4:5 and story 9:16)
// plus a brand kit folder of logos and icons as PNG.
//
//   Run:  npm i --no-save pptxgenjs sharp && node social/pohjat/build.cjs
//
// Same look as social/yrittajan-paiva (1080×1350 carousel): px values below
// are 1080-wide design pixels; the slide is 7.5" wide, so 144 px = 1 inch
// and a px font size halves into points.
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')
const pptxgen = require('pptxgenjs')
const sharp = require('sharp')

const HERE = __dirname
const REPO = join(HERE, '../..')
const ICONS = join(REPO, 'social/yrittajan-paiva/assets')
const KIT = join(HERE, 'brandikit')

// ---- brand tokens (same as social/yrittajan-paiva/render.mjs) ----
const C = {
  kerma: 'EFEEE9',
  musta: '161A14',
  metsa: '122C12',
  vihrea: '6EB82A',
  brand: '006845',
  terra: 'C95B3D',
  surfaceGreen: 'DDE3D4',
  mutedOnLight: '4B5147',
  mutedOnTint: '3A4F3A',
  mutedOnDark: 'C4D3BA',
}
const SEMI = 'Hanken Grotesk SemiBold'
const EXTRA = 'Hanken Grotesk ExtraBold'

const px = (v) => v / 144
const pt = (v) => v / 2
const M = 88 // side margin
const W = 1080
const CW = W - 2 * M

// ---- images: recolour single-colour SVGs and rasterise to PNG ----
async function png(svgPath, from, to, width) {
  let svg = readFileSync(svgPath, 'utf8')
  svg = svg.replace(from, `#${to}`)
  return sharp(Buffer.from(svg), { density: 600 }).resize({ width }).png().toBuffer()
}
const data = (buf) => 'image/png;base64,' + buf.toString('base64')

const ICON_NAMES = ['euro', 'eurooppa', 'kierratys', 'kirja', 'nuoli', 'ratas']
const GREEN = /#006845/gi
const WHITE = /#fff(fff)?\b/gi

async function loadImages() {
  const img = { icon: {}, iconLight: {} }
  for (const n of ICON_NAMES) {
    img.icon[n] = await png(join(ICONS, `${n}.svg`), GREEN, C.brand, 512)
    img.iconLight[n] = await png(join(ICONS, `${n}.svg`), GREEN, C.vihrea, 512)
  }
  const globe = join(REPO, 'src/assets/vihreat-logo.svg')
  img.globeWhite = await png(globe, GREEN, 'FFFFFF', 512)
  img.globeGreen = await png(globe, GREEN, C.brand, 512)
  const full = join(ICONS, 'vihreat-logo-neg.svg')
  img.fullWhite = await png(full, WHITE, 'FFFFFF', 1600)
  img.fullGreen = await png(full, WHITE, C.brand, 1600)
  return img
}

function writeKit(img) {
  mkdirSync(join(KIT, 'ikonit'), { recursive: true })
  const files = {
    'logo-maapallo-valkoinen.png': img.globeWhite,
    'logo-maapallo-vihrea.png': img.globeGreen,
    'logo-vihreat-valkoinen.png': img.fullWhite,
    'logo-vihreat-vihrea.png': img.fullGreen,
  }
  for (const [name, buf] of Object.entries(files)) writeFileSync(join(KIT, name), buf)
  for (const n of ICON_NAMES) {
    writeFileSync(join(KIT, 'ikonit', `${n}-tumma.png`), img.icon[n])
    writeFileSync(join(KIT, 'ikonit', `${n}-vaalea.png`), img.iconLight[n])
  }
}

// ---- shared slide pieces ----
function newDeck(heightPx, title) {
  const pres = new pptxgen()
  pres.defineLayout({ name: 'MV', width: px(W), height: px(heightPx) })
  pres.layout = 'MV'
  pres.author = 'Markkinavihreät'
  pres.title = title
  pres.theme = { headFontFace: EXTRA, bodyFontFace: SEMI }
  for (const [name, bg] of [
    ['Tumma', C.metsa],
    ['Vaalea', C.kerma],
    ['Vihertävä', C.surfaceGreen],
  ]) {
    pres.defineSlideMaster({ title: name, background: { color: bg } })
  }
  return pres
}

function text(slide, t, x, y, w, h, o = {}) {
  slide.addText(t, {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    margin: 0,
    valign: 'top',
    isTextBox: true,
    fontFace: SEMI,
    ...o,
  })
}

function eyebrow(slide, label, color, y) {
  text(slide, label.toUpperCase(), M, y, 700, 40, {
    fontFace: EXTRA,
    fontSize: pt(27),
    charSpacing: 2.2,
    color,
    objectName: 'Yläotsikko',
  })
}

function image(slide, buf, x, y, w, h, name) {
  slide.addImage({ data: data(buf), x: px(x), y: px(y), w: px(w), h: px(h), objectName: name })
}

// ---- slide builders (y positions take the slide height so stories reuse them) ----
function cover(pres, img, H, top) {
  const s = pres.addSlide({ masterName: 'Tumma' })
  eyebrow(s, '[Aihe tai teema]', C.vihrea, top + 15)
  image(s, img.globeWhite, W - M - 70, top, 70, 70, 'Logo')
  const mid = H / 2 - 260
  text(
    s,
    [
      { text: '[Iso otsikko,', options: { breakLine: true } },
      { text: 'korostus.]', options: { color: C.vihrea } },
    ],
    M,
    mid,
    CW,
    230,
    {
      fontFace: EXTRA,
      fontSize: pt(104),
      lineSpacingMultiple: 0.95,
      color: C.kerma,
      objectName: 'Otsikko',
    },
  )
  text(s, '[Alaotsikko: yksi lause, joka kertoo ongelman tai tilanteen.]', M, mid + 280, 840, 110, {
    fontSize: pt(40),
    lineSpacingMultiple: 1.2,
    color: C.mutedOnDark,
    objectName: 'Alaotsikko',
  })
  text(
    s,
    '[Vahvempi lause: mitä markkinavihreät ehdottavat tai mitä seuraavilla dioilla on.]',
    M,
    mid + 410,
    840,
    110,
    {
      fontFace: EXTRA,
      fontSize: pt(40),
      lineSpacingMultiple: 1.2,
      color: C.kerma,
      objectName: 'Ingressi',
    },
  )
  const foot = H - top - 96
  text(s, 'markkinavihreat.fi', M, foot + 26, 500, 50, {
    fontFace: EXTRA,
    fontSize: pt(34),
    color: C.kerma,
    objectName: 'Osoite',
  })
  image(s, img.iconLight.nuoli, W - M - 96, foot, 96, 96, 'Pyyhkäise-nuoli')
  s.addNotes(
    'Kansi. Vaihda [hakasulkeissa] olevat tekstit. Korostussana vihreällä. Nuoli kertoo, että karusellissa on lisää dioja; poista se, jos julkaiset vain yhden kuvan.',
  )
}

function content(pres, img, { master, num, icon, page }) {
  const tint = master === 'Vihertävä'
  const s = pres.addSlide({ masterName: master })
  const fg = tint ? C.metsa : C.musta
  eyebrow(s, 'Markkinavihreät', C.brand, 92)
  text(s, page, W - M - 200, 92, 200, 40, {
    fontSize: pt(25),
    color: tint ? C.mutedOnTint : C.mutedOnLight,
    align: 'right',
    objectName: 'Sivunumero',
  })
  image(s, img.icon[icon], M, 184, 132, 132, 'Ikoni')
  text(s, String(num), M, 360, 90, 110, {
    fontFace: EXTRA,
    fontSize: pt(104),
    color: C.brand,
    objectName: 'Numero',
  })
  text(s, '[Kohdan otsikko, enintään kaksi riviä]', M + 106, 360, CW - 106, 140, {
    fontFace: EXTRA,
    fontSize: pt(60),
    lineSpacingMultiple: 1.0,
    color: fg,
    objectName: 'Otsikko',
  })
  text(s, '[Johdantolause: miksi asia on ongelma nyt.]', M, 528, CW, 100, {
    fontSize: pt(33),
    lineSpacingMultiple: 1.3,
    color: tint ? C.mutedOnTint : C.mutedOnLight,
    objectName: 'Johdanto',
  })
  const bullets = [
    '[Ensimmäinen ongelma lyhyesti]',
    '[Toinen ongelma lyhyesti]',
    '[Kolmas ongelma lyhyesti]',
  ]
  bullets.forEach((b, i) => {
    const y = 656 + i * 100
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: px(M),
      y: px(y + 2),
      w: px(48),
      h: px(48),
      rectRadius: px(12),
      fill: { color: C.terra },
      line: { type: 'none' },
      objectName: `Ruksi ${i + 1}`,
    })
    text(s, '✕', M, y + 2, 48, 48, {
      fontFace: EXTRA,
      fontSize: pt(26),
      color: C.kerma,
      align: 'center',
      valign: 'middle',
      objectName: `Ruksin merkki ${i + 1}`,
    })
    text(s, b, M + 72, y, CW - 72, 90, {
      fontSize: pt(34),
      lineSpacingMultiple: 1.2,
      color: fg,
      objectName: `Luettelokohta ${i + 1}`,
    })
  })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px(M),
    y: px(1048),
    w: px(CW),
    h: px(210),
    rectRadius: px(28),
    fill: { color: C.brand },
    line: { type: 'none' },
    objectName: 'Ratkaisulaatikko',
  })
  text(
    s,
    [
      { text: 'Markkinavihreät haluavat: ', options: { fontFace: EXTRA } },
      { text: '[ratkaisu yhdellä tai kahdella lauseella].' },
    ],
    M + 40,
    1048 + 38,
    CW - 80,
    210 - 76,
    { fontSize: pt(35), lineSpacingMultiple: 1.25, color: C.kerma, objectName: 'Ratkaisu' },
  )
  s.addNotes(
    'Sisältödia. Kopioi dia (Ctrl/Cmd+D) jokaista kohtaa varten ja päivitä numero ja sivunumero. Vaihda ikoni työkalupakki-diasta. Pidä luettelokohdat yhden rivin mittaisina; poista kohta (ruksi + teksti), jos tarvitset vain kaksi.',
  )
}

function quote(pres, img, H, top) {
  const s = pres.addSlide({ masterName: 'Vaalea' })
  eyebrow(s, 'Markkinavihreät', C.brand, top + 15)
  image(s, img.globeGreen, W - M - 70, top, 70, 70, 'Logo')
  const photoY = top + 140
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px(M),
    y: px(photoY),
    w: px(300),
    h: px(300),
    rectRadius: px(28),
    fill: { color: C.surfaceGreen },
    line: { type: 'none' },
    objectName: 'Kuvan paikka',
  })
  text(s, '[Oma kuva tähän]', M, photoY, 300, 300, {
    fontSize: pt(28),
    color: C.mutedOnTint,
    align: 'center',
    valign: 'middle',
    objectName: 'Kuvan ohje',
  })
  const q = top + 480
  text(s, '“', M - 6, q - 20, 200, 160, {
    fontFace: EXTRA,
    fontSize: pt(200),
    color: C.brand,
    objectName: 'Lainausmerkki',
  })
  text(s, '[Lainaus omin sanoin: yksi selkeä ajatus, enintään neljä riviä.]', M, q + 120, CW, 340, {
    fontFace: EXTRA,
    fontSize: pt(60),
    lineSpacingMultiple: 1.08,
    color: C.musta,
    objectName: 'Lainaus',
  })
  text(s, '[Etunimi Sukunimi]', M, H - top - 150, CW, 50, {
    fontFace: EXTRA,
    fontSize: pt(38),
    color: C.brand,
    objectName: 'Nimi',
  })
  text(s, '[Rooli, kunta · markkinavihreä]', M, H - top - 94, CW, 50, {
    fontSize: pt(32),
    color: C.mutedOnLight,
    objectName: 'Rooli',
  })
  s.addNotes(
    'Sitaattidia, toimii myös yksittäisenä kuvana. Vaihda kuva: poista vihreä laatikko ja lisää oma kuva samaan kohtaan (rajaa neliöksi). Nimi ja rooli kuten haluat ne näkyvän.',
  )
}

function cta(pres, img, H, top) {
  const s = pres.addSlide({ masterName: 'Tumma' })
  eyebrow(s, 'Markkinavihreät', C.vihrea, top + 15)
  const mid = H / 2 - 300
  image(s, img.iconLight.kirja, M, mid, 104, 104, 'Ikoni')
  text(
    s,
    [
      { text: '[Loppuviesti, jossa ' },
      { text: 'korostus', options: { color: C.vihrea } },
      { text: ' ja kehotus toimia.]' },
    ],
    M,
    mid + 150,
    CW,
    300,
    {
      fontFace: EXTRA,
      fontSize: pt(64),
      lineSpacingMultiple: 1.05,
      color: C.kerma,
      objectName: 'Loppuviesti',
    },
  )
  text(
    s,
    [
      { text: 'Lue lisää: ' },
      { text: 'markkinavihreat.fi', options: { fontFace: EXTRA, color: C.vihrea } },
    ],
    M,
    mid + 480,
    CW,
    50,
    { fontSize: pt(34), color: C.mutedOnDark, objectName: 'Linkki' },
  )
  image(s, img.fullWhite, (W - 250) / 2, H - top - 78, 250, 78, 'Vihreät-logo')
  s.addNotes('Lopetusdia. Vaihda linkki, jos ohjaat omaan blogiin tai tapahtumaan.')
}

function toolkit(pres, img) {
  const s = pres.addSlide({ masterName: 'Vaalea' })
  s.hidden = true
  eyebrow(s, 'Työkalupakki · piilotettu dia', C.brand, 92)
  text(
    s,
    'Kopioi tästä ikonit, logot ja värit. Dia on piilotettu; poista se ennen kuvien vientiä.',
    M,
    150,
    CW,
    90,
    {
      fontSize: pt(30),
      color: C.mutedOnLight,
    },
  )
  ICON_NAMES.forEach((n, i) => {
    const x = M + i * 150
    image(s, img.icon[n], x, 270, 110, 110, `Ikoni ${n} tumma`)
  })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px(M - 20),
    y: px(410),
    w: px(CW + 40),
    h: px(150),
    rectRadius: px(20),
    fill: { color: C.metsa },
    line: { type: 'none' },
  })
  ICON_NAMES.forEach((n, i) => {
    const x = M + i * 150
    image(s, img.iconLight[n], x, 430, 110, 110, `Ikoni ${n} vaalea`)
  })
  image(s, img.fullGreen, M, 610, 320, 100, 'Vihreät-logo vihreä')
  image(s, img.globeGreen, M + 380, 610, 100, 100, 'Maapallo vihreä')
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px(M + 540),
    y: px(590),
    w: px(CW - 540),
    h: px(140),
    rectRadius: px(20),
    fill: { color: C.metsa },
    line: { type: 'none' },
  })
  image(s, img.fullWhite, M + 560, 610, 220, 69, 'Vihreät-logo valkoinen')
  image(s, img.globeWhite, M + 810, 616, 60, 60, 'Maapallo valkoinen')
  const swatches = [
    ['Metsä', C.metsa, C.kerma],
    ['Kerma', C.kerma, C.musta],
    ['Vihertävä', C.surfaceGreen, C.metsa],
    ['Brändivihreä', C.brand, C.kerma],
    ['Kirkas vihreä', C.vihrea, C.musta],
    ['Terra', C.terra, C.kerma],
  ]
  swatches.forEach(([name, hex, fg], i) => {
    const x = M + (i % 3) * 310
    const y = 790 + Math.floor(i / 3) * 210
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: px(x),
      y: px(y),
      w: px(284),
      h: px(180),
      rectRadius: px(20),
      fill: { color: hex },
      line: { color: C.mutedOnLight, width: 0.5 },
    })
    text(
      s,
      [{ text: name, options: { fontFace: EXTRA, breakLine: true } }, { text: `#${hex}` }],
      x + 24,
      y + 24,
      240,
      130,
      {
        fontSize: pt(28),
        color: fg,
      },
    )
  })
  text(
    s,
    'Fontti: Hanken Grotesk – SemiBold leipätekstiin, ExtraBold otsikoihin.',
    M,
    1220,
    CW,
    50,
    {
      fontSize: pt(28),
      color: C.mutedOnLight,
    },
  )
}

async function main() {
  const img = await loadImages()
  writeKit(img)

  const feed = newDeck(1350, 'Markkinavihreät – postauspohja 4:5')
  cover(feed, img, 1350, 92)
  content(feed, img, { master: 'Vaalea', num: 1, icon: 'euro', page: '2 / 5' })
  content(feed, img, { master: 'Vihertävä', num: 2, icon: 'ratas', page: '3 / 5' })
  quote(feed, img, 1350, 92)
  cta(feed, img, 1350, 92)
  toolkit(feed, img)
  await feed.writeFile({ fileName: join(HERE, 'markkinavihreat-postaus-4x5.pptx') })

  // Stories keep ~250 px clear top and bottom for the app's own UI.
  const story = newDeck(1920, 'Markkinavihreät – tarinapohja 9:16')
  cover(story, img, 1920, 250)
  quote(story, img, 1920, 250)
  cta(story, img, 1920, 250)
  await story.writeFile({ fileName: join(HERE, 'markkinavihreat-tarina-9x16.pptx') })

  // pptxgenjs writes folder entries into the zip; cloud editors (Drive,
  // OneDrive) have failed to open such files.
  for (const f of ['markkinavihreat-postaus-4x5.pptx', 'markkinavihreat-tarina-9x16.pptx']) {
    execFileSync('zip', ['-dq', join(HERE, f), '*/'])
  }
  console.log('done')
}

main()
