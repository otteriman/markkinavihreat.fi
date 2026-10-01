// Renders the "Palkalla pitää voida vaurastua!" share images (1080×1080 @2x)
// into public/social/varallisuustili/ (served by the site, linked from the
// program page).
//
//   Run: node social/varallisuustili/render.mjs
//
// Numbers are an illustrative round example (1 000 € gross, ~40 % marginal
// tax), not a forecast — each image says so.
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '@playwright/test'
const { chromium } = pkg

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../..')
const OUT = process.env.OUT || join(REPO, 'public/social/varallisuustili')

const C = {
  kerma: '#efeee9',
  musta: '#161a14',
  metsa: '#122c12',
  vihrea: '#6eb82a',
  brand: '#006845',
  terra: '#c95b3d',
  surfaceGreen: '#dde3d4',
  muted: '#4b5147',
}
const b64 = (p) => readFileSync(p).toString('base64')
const fontSemi = b64(join(REPO, 'src/assets/fonts/HankenGrotesk-SemiBold.ttf'))
const fontExtra = b64(join(REPO, 'src/assets/fonts/HankenGrotesk-ExtraBold.ttf'))
const logo = (color) =>
  readFileSync(join(REPO, 'src/assets/vihreat-logo.svg'), 'utf8')
    .replace(/#006845/gi, color)
    .replace(/\s(width|height)="[^"]*"/g, '')

const top = (dark) => `
  <header class="top"><span class="eyebrow">Markkinavihreät</span>
  <span class="logo-sm">${logo(dark ? '#ffffff' : C.brand)}</span></header>`
const foot = `<footer class="foot">markkinavihreat.fi</footer>`

const slides = [
  // 1 — same paycheck, different starting line
  {
    name: 'sama-palkka-eri-lahtoviiva',
    theme: 'light',
    html: `
      ${top(false)}
      <h1 class="title">Sama palkka.<br><span class="acc">Eri lähtöviiva.</span></h1>
      <p class="sub">1 000 € palkkaa sijoitukseen:</p>
      <div class="chart">
        <div class="col">
          <div class="amount">600 €</div>
          <div class="bar">
            <div class="seg tax" style="height:40%"><span>Vero 400 €</span></div>
            <div class="seg inv" style="height:60%"><span>Sijoitukseen</span></div>
          </div>
          <div class="label">Nyt</div>
        </div>
        <div class="col">
          <div class="amount big">1 000 €</div>
          <div class="bar">
            <div class="seg inv" style="height:100%"><span>Sijoitukseen</span></div>
          </div>
          <div class="label good">Varallisuustilillä</div>
        </div>
      </div>
      <p class="note">Vero maksetaan vasta, kun nostat rahat käyttöösi. Esimerkissä veroaste on 40 %.</p>
      ${foot}`,
  },
  // 2 — when tax is paid
  {
    name: 'vero-vasta-nostettaessa',
    theme: 'dark',
    html: `
      ${top(true)}
      <h1 class="title">Verotetaan <span class="acc">kulutusta</span>,<br>ei vaurastumista.</h1>
      <div class="steps">
        <div class="step"><span class="n">1</span><div><b>Palkka</b><br>Siirrä säästöön ennen veroa</div></div>
        <div class="arrow">↓</div>
        <div class="step hi"><span class="n">2</span><div><b>Varallisuustili</b><br>Sijoita vapaasti, vaihda kohteita ilman veroa</div></div>
        <div class="arrow">↓</div>
        <div class="step"><span class="n">3</span><div><b>Nosto</b><br>Vero maksetaan vasta, kun käytät rahat</div></div>
      </div>
      ${foot}`,
  },
  // 3 — four benefits
  {
    name: 'nelja-hyotya',
    theme: 'tint',
    html: `
      ${top(false)}
      <h1 class="title">Palkalla pitää<br><span class="acc">voida vaurastua!</span></h1>
      <p class="sub">Varallisuustili tuo palkansaajalle:</p>
      <ol class="list">
        <li><span class="n">1</span>Isomman alkupääoman, kun sijoitat ennen veroa</li>
        <li><span class="n">2</span>Vapauden sijoittaa mihin haluat</li>
        <li><span class="n">3</span>Vaihdon ilman luovutusvoittoveroa</li>
        <li><span class="n">4</span>Reilun verotuksen: kulutus verotetaan, ei vaurastumista</li>
      </ol>
      ${foot}`,
  },
]

const css = `
  @font-face { font-family:'Hanken Grotesk'; font-weight:600; src:url(data:font/ttf;base64,${fontSemi}) format('truetype'); }
  @font-face { font-family:'Hanken Grotesk'; font-weight:800; src:url(data:font/ttf;base64,${fontExtra}) format('truetype'); }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Hanken Grotesk', sans-serif; font-weight:600; -webkit-font-smoothing:antialiased; }
  .slide { width:1080px; height:1080px; overflow:hidden; padding:72px 80px; display:flex; flex-direction:column; }
  .theme-light { background:${C.kerma}; color:${C.musta}; }
  .theme-tint { background:${C.surfaceGreen}; color:${C.metsa}; }
  .theme-dark { background:${C.metsa}; color:${C.kerma}; }
  .top { display:flex; justify-content:space-between; align-items:center; margin-bottom:36px; }
  .eyebrow { font-weight:800; font-size:26px; letter-spacing:.16em; text-transform:uppercase; }
  .theme-dark .eyebrow { color:${C.vihrea}; } .theme-light .eyebrow, .theme-tint .eyebrow { color:${C.brand}; }
  .logo-sm svg { width:64px; height:64px; display:block; }
  .title { font-weight:800; font-size:78px; line-height:1.03; letter-spacing:-.02em; }
  .acc { color:${C.brand}; } .theme-dark .acc { color:${C.vihrea}; }
  .sub { font-size:34px; margin-top:22px; color:${C.muted}; }
  .note { font-size:25px; color:${C.muted}; margin-top:auto; padding-top:16px; }
  .foot { font-weight:800; font-size:26px; letter-spacing:.04em; margin-top:18px; opacity:.75; }
  .chart { flex:1; display:flex; gap:56px; justify-content:center; align-items:flex-end; margin-top:12px; min-height:0; }
  .col { width:380px; display:flex; flex-direction:column; justify-content:flex-end; }
  .amount { font-weight:800; font-size:54px; text-align:center; margin-bottom:10px; }
  .amount.big { color:${C.brand}; font-size:64px; }
  .bar { display:flex; flex-direction:column; justify-content:flex-end; border-radius:20px; overflow:hidden; }
  .col:nth-child(1) .bar { height:216px; }
  .col:nth-child(2) .bar { height:360px; }
  .seg { display:flex; align-items:center; justify-content:center; font-weight:800; font-size:32px; color:${C.kerma}; text-align:center; }
  .seg.tax { background:${C.terra}; } .seg.inv { background:${C.brand}; }
  .label { text-align:center; font-weight:800; font-size:36px; margin-top:14px; }
  .label.good { color:${C.brand}; }
  .steps { flex:1; display:flex; flex-direction:column; justify-content:center; gap:10px; margin-top:20px; }
  .step { display:flex; align-items:center; gap:28px; font-size:36px; line-height:1.25; padding:28px 34px; border-radius:26px; background:rgba(255,255,255,.08); }
  .step.hi { background:${C.brand}; }
  .step b { font-weight:800; font-size:42px; }
  .n { flex:0 0 auto; width:68px; height:68px; border-radius:50%; background:${C.vihrea}; color:${C.metsa}; font-weight:800; font-size:40px; display:flex; align-items:center; justify-content:center; }
  .arrow { text-align:center; font-size:44px; color:${C.vihrea}; font-weight:800; line-height:1; }
  .list { list-style:none; flex:1; display:flex; flex-direction:column; justify-content:center; gap:24px; margin-top:10px; }
  .list li { display:flex; align-items:center; gap:28px; font-size:38px; font-weight:800; line-height:1.2; background:${C.kerma}; padding:26px 32px; border-radius:26px; }
  .list .n { background:${C.brand}; color:${C.kerma}; }
`

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({
  viewport: { width: 1080, height: 1080 },
  deviceScaleFactor: 2,
})
for (const s of slides) {
  await page.setContent(
    `<!doctype html><html lang="fi"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="slide theme-${s.theme}">${s.html}</div></body></html>`,
  )
  await page.evaluate(() => document.fonts.ready)
  const file = join(OUT, `${s.name}.png`)
  await page.locator('.slide').screenshot({ path: file })
  console.log('wrote', file)
}
await browser.close()
