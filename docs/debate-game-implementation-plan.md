# "Vihreä väittely" debate game: implementation plan

Game spec: "Vihreä väittely – pelin speksi" (Jarkko, Oct 16, 2026). This plan covers how to build it on markkinavihreat.fi at `/debaattipeli/`, alongside the quiz at `/testi/` (branch `claude/admiring-faraday-odeqk2`). Work through the phases in order and stop after each one for review.

---

## 1. What the quiz branch tells us (reuse, don't reinvent)

The quiz uses **no JS framework**. It is Astro plus plain TypeScript, and the game should follow the same approach:

| Concern          | Quiz approach                                                                                      | Game equivalent                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Routes           | Thin wrappers `src/pages/{,sv/,en/}testi/index.astro` render `components/pages/QuizBody.astro`     | `src/pages/debaattipeli/index.astro` etc. render `DebateBody.astro` |
| Content          | JSON in `src/data/quiz/*.json`, `{fi,sv,en}` per string, `needsReview` flag, "TODO" allowed        | `src/data/debate/*.json`, same shape                               |
| Pure logic       | `src/lib/quiz/*.ts` (scoring, flow, url), no DOM, unit tested with vitest                          | `src/lib/debate/*.ts`: the whole battle engine, no DOM             |
| Client code      | `src/scripts/quiz/*.ts`, markup server-rendered by Astro, script only wires behaviour              | `src/scripts/debate/*.ts`                                          |
| Art              | Code-generated SVG (`bonusArt.ts`), no raster assets                                               | Pixel sprites as string grids rendered to inline SVG               |
| Dev-only preview | `src/pages/[lab].astro` serves `/quiz-lab/` only in dev or when `NOINDEX=true`                     | Add `/debate-lab/` the same way (sprites, text box, bars)          |
| Tests            | `tests/unit/quiz-*.test.ts`, `tests/e2e/quiz*.spec.ts`                                             | `tests/unit/debate-*.test.ts`, `tests/e2e/debate.spec.ts`          |
| Validation       | `scripts/validate-translations.ts` walks `src/data/quiz` (fi+sv+en, reports TODO/needsReview)      | Extend it to also walk `src/data/debate`                           |
| Launch gating    | `noindex` plus excluded from the sitemap in `astro.config.mjs` until launch                        | Same, for `/debaattipeli/`                                         |
| Preview CI       | `.github/workflows/preview-pages.yml` builds a GitHub Pages preview per branch                     | Copied into this branch (see section 9)                            |

**Decision: no UI framework** (no React/Preact). The game is a small state machine with a text box and a grid of buttons. It keeps the bundle tiny, matches the quiz, and needs no new dependencies (AGENTS.md asks us to ask before adding any).

## 2. Hard constraints

- Static output only, no backend, no saved data. Nothing about the player's choices is stored or sent (no localStorage, cookies or analytics payloads). The spec says "no saved data".
- Original pixel art only. No Pokémon sprites, music, logos or names. No real politicians or party logos.
- Content rules from the spec: positions, not people; no slurs or jokes about ethnicity or immigrants.
- Accessibility: every action reachable by tap, click and keyboard (arrows plus Enter/Space). Real `<button>`s, live-region narration for screen readers, `prefers-reduced-motion` replaces typing, shake and blink with instant changes. Sound is off by default with a mute toggle.
- Don't invent copy. The dialect question in the spec is still open (section 10).

## 3. Architecture

### 3.1 Data (`src/data/debate/`)

One file per concern, so a second enemy (kokoomuslainen, vasemmistolainen) is a new JSON file with no code changes:

- `config.json`: the single tunable object: `startKannatus: 100`, `baseDamage: 30`, `rounds: 4`, damage multiplier per quality (`tehokas: 0`, `kohtalainen: 0.5`, `heikko: 1`), typing speed.
- `enemies/kansalliskonservatiivi.json`: name, intro line, 4 enemy attacks (announcement, line, 4 replies each with `label`, `player` line, `quality`, `reaction`), 6 player attacks (label, line, tier, 4 defenses each with `quality`, `text`).
- `ui.json`: all narration and UI strings (intro, round start, prompts, effect texts, ending texts, button labels, mute toggle).

All strings are `{ fi, sv, en }` objects like the quiz. The spec says the game is Finnish, so `sv`/`en` start as `"TODO"` (accepted by the validator, reported as open items). See open question 1 for routes in other locales.

Tier ("Vahva" / "Hyvä" / "Heikko") is **derived from the defenses**, not stored, so the data can't disagree with itself. A test asserts the derived tiers match the spec table.

### 3.2 Engine (`src/lib/debate/`), pure and fully unit tested

- `types.ts`: `Quality`, `EnemyAttack`, `PlayerAttack`, `Enemy`, `BattleState`, `BattleEvent`.
- `rng.ts`: injectable RNG (`() => number`) plus a seeded one (mulberry32) for tests.
- `damage.ts`: `damageFor(quality, config)`.
- `battle.ts`: an explicit state machine, `step(state, input) -> { state, events }`. Phases: `intro → roundStart → enemyAttack → replyPrompt → replyResolved → attackPrompt → attackResolved → (next round | ending)`. It:
  - picks the enemy's 4 attacks in random order with no repeats (a shuffled deck of the enemy's 4 attacks);
  - shuffles the 4 replies per attack;
  - tracks used player attacks (each once);
  - picks the enemy defense uniformly at random;
  - applies damage, checks for KO **immediately after each hit** (so a KO in the enemy half ends the battle before the player's attack);
  - ends after round 4 with win / lose / tie on points.
- `ending.ts`: result kind (`koWin`, `koLose`, `pointsWin`, `pointsLose`, `tie`), strong-reply count ("Täydelliset vastaukset: 3/4").

The engine emits **events** (`say-bottom`, `say-top`, `effect`, `drain-bar`, `shake`, `blink`, `end`) and the UI just plays them back. That keeps the engine free of timing and the UI free of rules.

### 3.3 UI (`src/components/` + `src/scripts/debate/`)

- `components/pages/DebateBody.astro`: server-renders the static shell (240×216 stage, boxes, status boxes, sprite slots, mute toggle, noscript fallback). Per-locale JSON config goes into a `<script type="application/json">` the way `BonusGame.astro` does, so the script ships no copy.
- `DebateSprites.astro`: inline SVG sprites (section 4).
- `scripts/debate/init.ts`: wires the engine to the DOM.
- `scripts/debate/typewriter.ts`: letter-by-letter text; tap/key completes the line first, then advances. Instant under reduced motion.
- `scripts/debate/menu.ts`: 2×2 reply grid and 2×3 attack grid; roving focus, arrow keys, cursor arrow, greyed used attacks (`aria-disabled`, not removed).
- `scripts/debate/audio.ts`: optional WebAudio chiptune bleeps (generated, no audio files); mute toggle; no sound until the first user gesture.
- Narration is mirrored into an `aria-live="polite"` region.

### 3.4 Rendering approach

Fixed **240×216 logical pixel** stage, DOM + CSS, not `<canvas>`. DOM keeps real buttons, focus and screen-reader support, and text rendering is easy. Scale by **whole numbers** (`floor(min(vw/240, vh/216))`, minimum 1) with CSS `zoom`/`transform`, centred; portrait phones work because 240×216 is nearly square. Pixelated rendering via `image-rendering: pixelated` and `shape-rendering="crispEdges"`.

Palette as CSS custom properties: `#0F380F #306230 #8BAC0F #9BBC0F`. All UI is drawn from these four.

## 4. Art (no designer)

Same approach as the quiz: generated in code.

- **Sprites** as arrays of strings (one char per pixel, digits 0–3 = palette shade, `.` = transparent) in `src/lib/debate/sprites.ts`, converted to inline SVG `<rect>` runs. Player from behind (bottom left, ~56×56), enemy from the front (top right, ~48×48): a generic mid-aged man in a fleece vest and cap, original design.
- Animations by CSS class: `shake` (hit), `blink` (KANNATUS drops), entry slide in at the intro.
- Status boxes, bars and boxes drawn with CSS borders in the palette; bar drains with `steps()` easing to look 8-bit.
- **Font**: needs ä and ö, legible at small sizes, and short enough that 15-character button labels fit a half-width grid cell. Candidates (all OFL): Pixelify Sans, Silkscreen, VT323, Press Start 2P (the latter is too wide for 240 px). Prototype two in `/debate-lab/` and pick one. The quiz loads Patrick Hand from Google Fonts via `BonusFont.astro`; for consistency do the same unless we decide to self-host (open question 3).

## 5. Routes and integration with the quiz

- `src/pages/debaattipeli/index.astro` → `<DebateBody locale="fi" />`, with `sv`/`en` mirrors per AGENTS.md (thin wrappers, hardcoded locale; no catch-all directory).
- `/debate-lab/` is added to `src/pages/[lab].astro` (dev and `NOINDEX=true` only). If the quiz branch has landed, extend its `getStaticPaths` to return both labs.
- Layout: `BaseLayout` with `noindex` until launch. `astro.config.mjs` sitemap filter excludes `/debaattipeli/` and `/debate-lab/` next to the quiz entries.
- **Integration points** (all optional, decide in review): (a) a link from the quiz result page ("Kokeile väittelyä") and the other way round; (b) a shared "play more" card component; (c) the quiz's bonus-level overlay pattern (full screen, focus management, `prefers-reduced-motion`) is reusable as a reference for the game's start/ending screens. The game never reads quiz results.
- Footer/Nav entry only at launch, not before.

## 6. Balance and tests

**Unit (vitest)**, `tests/unit/debate-*.test.ts`:

- `debate-data`: every enemy attack has exactly 4 replies = 1 tehokas + 1 kohtalainen + 2 heikko; every player attack has 4 defenses; derived tiers equal the spec (Huoltovarmuus/Kotimainen ruoka vahva; Ratahankkeet/Vihreä teollisuus hyvä; Ilmastokriisi/Lihavero heikko); button labels ≤ 15 chars; 4 enemy attacks, 6 player attacks.
- `debate-battle`: no enemy attack repeats; each player attack usable once; KO ends the battle mid-round; round 4 ends on points; tie ending; same seed gives the same battle; damage table (0/15/30).
- `debate-balance`: Monte-Carlo (e.g. 20 000 seeded battles per strategy) checks the spec's expected values: perfect play → player 100 / enemy ≈ 40; all kohtalainen → 40/40; random play → ≈ 25 vs ≈ 55 and a clear loss rate; tolerance bands, so retuning `config.json` that breaks the intended difficulty fails CI.
- `debate-typewriter`: line completion and advance semantics (logic part only).

**E2E (playwright)**, `tests/e2e/debate.spec.ts`: page loads with noindex; intro → full 4-round battle by keyboard only (with a fixed seed via a `?seed=` param that is honoured only in dev/preview builds, as with the quiz tests, or via `page.addInitScript` stubbing `Math.random`); tap-only path on a mobile viewport; used attacks are greyed and not selectable; end screen shows result plus "Täydelliset vastaukset: n/4" and "Pelaa uudelleen" restarts in one tap; no hints on any end screen; mute toggle; reduced-motion; no network requests besides fonts; nothing in storage.

## 7. Phases

Each phase ends with `npm run format:check && npm run lint && npm run check && npm run validate:translations && npm run test && npm run build` green and a stop for review. One logical change per commit (Conventional Commits), pushed right after.

0. **Branch, CI, plan** (this commit): plan doc and the preview workflow.
1. **Data and engine**: `config.json`, enemy JSON (all copy exactly as in the spec), `ui.json`; `src/lib/debate/*`; unit and balance tests; extend `validate-translations.ts`. No UI yet.
2. **Static shell and lab**: `DebateBody.astro`, the 240×216 stage, palette, font prototype, boxes, status boxes, placeholder sprites, `/debate-lab/`, routes for fi/sv/en, noindex and sitemap exclusion.
3. **Battle UI**: wire engine to DOM: typewriter, 2×2 and 2×3 menus, keyboard and touch, KANNATUS bars, effect texts, endings, end screen, restart.
4. **Art and juice**: final sprites, shake/blink, intro slide-in, bar drain, optional chiptune audio and mute, reduced-motion variants.
5. **Polish and integration**: e2e tests, mobile portrait pass, accessibility pass (screen reader narration, focus order), quiz cross-links, Lighthouse check, README entry.
6. **Launch checklist**: dialect copy filled in, `needsReview` cleared, remove noindex and sitemap exclusion, add Nav/Footer entry, PR to `main` for human review.

## 8. Risks

- **Font width**: Finnish compounds (e.g. "Kansalliskonservatiivi", "Joukkoliikenne") in a 240 px stage. Mitigation: font prototype in Phase 2, labels capped at 15 chars, enemy name abbreviated "KANSALLISKONS." as in the spec.
- **Long lines in boxes**: the longest player lines (~100 characters) must fit the bottom box in 2–3 lines. Mitigation: a data test computing max line length and a lab page showing the longest of each.
- **Balance drift** when copy or config changes: covered by the Monte-Carlo test.
- **Merge conflicts with the quiz branch** in `astro.config.mjs` (sitemap filter), `scripts/validate-translations.ts`, `src/pages/[lab].astro`, and the README. They are small, and will be resolved by rebasing onto `main` once the quiz lands. Don't copy the quiz's versions of these files in advance.

## 9. CI

`.github/workflows/ci.yml` (on `main`) already runs format, lint, check, translations, unit tests, build, `check:og` and e2e on every PR. This branch also carries `.github/workflows/preview-pages.yml`, copied unchanged from the quiz branch, so each push builds a `noindex` GitHub Pages preview at `/<repo>/<branch-slug>/debaattipeli/` (the `BASE_PATH` handling is already in the quiz branch's `astro.config.mjs`, so the preview base path works once that lands; until then previews serve from `/`). The two branches' workflows are identical, so merging either one first is conflict-free.

## 10. Open questions

1. **Locales**: the spec is Finnish-only. Do we build `sv`/`en` routes (with `TODO` strings and the notice "only in Finnish"), or only `/debaattipeli/` and leave sv/en out until translated? Default in this plan: Finnish route only, data model ready for all three.
2. **Dialect** (spec's open checkbox): which dialect, and who writes the dialect versions of the player lines and UI texts? Until answered, the data keeps the spec's standard-Finnish text with `needsReview` markers.
3. **Font hosting**: Google Fonts like the quiz, or self-hosted (no third-party request, better for privacy)?
4. **Spec inconsistency**: in Enemy attack 4 (MAAHANMUUTTO) the reply button "Rasismi" says "Kasvisruoka on tulevaisuutta!", which doesn't match its label and reads oddly next to the enemy's "Ja nyt viedään makkarakin!". Please confirm the intended label and text. Related: the content guidelines rule out jokes about immigrants, so this attack's wording deserves a second pair of eyes before launch.
5. **Spec detail**: the layout mockup shows no numeric KANNATUS value, while the text says "a draining bar and the number". Plan: show the number (accessible and precise).
6. **Cross-linking with the quiz**: where, if anywhere, should the two link (result page, bonus level, nav)? Plan: result page card only.
