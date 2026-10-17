# "Vihreä väittely" debate game: implementation plan

Game spec: "Vihreä väittely – pelin speksi" (Jarkko, Oct 16, 2026). This plan covers how to build it on markkinavihreat.fi at `/debaattipeli/` (and its Swedish and English URLs), alongside the quiz at `/testi/` (branch `claude/admiring-faraday-odeqk2`). Work through the phases in order and stop after each one for review.

## Decisions so far

- **All three languages** (fi, sv, en) from the start, each with its own URL (section 5).
- **Dialect:** general Finnish, no regional dialect. Player lines are plain colloquial Finnish; the enemy speaks standard Finnish.
- **Content must be easy to change.** Attacks, replies and defenses will be edited, added and removed often. The data layout is designed around that (section 3.1).
- **Fonts are self-hosted.** No Google Fonts and no third-party requests from the game.
- **Difficulty is easy to adjust** without touching code or content (section 3.5). We will playtest and tune.
- **Translations are reviewed later**, after the game works; sv/en are drafts until then.
- **Spec oddity fixed** (MAAHANMUUTTO / "Rasismi" reply, section 3.1.1).
- **Rule change after Phase 3 (on request): no round limit, perfect defenses backfire.** Rounds are no longer announced or limited: the battle runs until one side's KANNATUS reaches 0. A perfect (strong) reply or defense now makes the attack backfire on the attacker (`counter` in the difficulty, half a hit in `normal`), which keeps battles to about four rounds (simulated: 3.8 with perfect play, 4.1 with random play). The enemy reshuffles his attacks when all are used (never the same twice in a row) and the player's used attacks free up once all six are spent. `maxRounds` (12) is only a safety net that decides on points. The frozen `spec` preset keeps the original rules (4 rounds, no backfire), so the tests against the spec's balance table still hold. Consequence for balance: all-medium replies, a coin flip under the old rules, now win only about 10%, in line with the spec's rule that replies must average better than Kohtalainen.
- **The enemy's defeat (after Phase 3, on request):** when he is knocked out, his box and the labels clear, his sprite slides off the right edge of the stage, and his own defeat line follows (`defeat` in his `enemy.json`, e.g. "Konservatiivi hävisi väittelyn, ja pakeni Twitteriin!"), replacing the generic "vaihtoi puheenaihetta" ending. Each future enemy brings his own.
- **Attack narration switched off (after Phase 4, on request, reversible):** "Konservatiivi käytti VELKAPANIIKKIA!" is no longer shown, since the label on his box names the attack. It's a setting, `presentation.announceEnemyAttack` in `config.json` (`false`); `true` restores it as it was. While off, the bottom box clears at each new round, and screen readers hear the label before his line.
- **Losing transition (after Phase 4, on request):** when the player loses (knockout or on points), after the losing line the screen goes dark in a circle closing from the edges to the middle, in pixel steps (1.2 s), holds a moment, and the end screen follows. On a knockout the line before the iris is "Silmissäsi pimenee..." and the end screen says "Kannatuksesi romahti. Heräät puoluetoimistolta." (`end.koLose` and `end.koLoseResult`; any ending can have a `…Result` text of its own for the end screen). Skipped with reduced motion.
- **Special characters and critical hits (after Phase 4, on request):** any reply or enemy comeback can carry a `critical` trigger naming a special character from `src/data/debate/specials/`. When that answer's hit does damage, he may step in (the trigger's `chance`, or the difficulty's `critical.chance`). A striped cut-in opens over the middle of the stage and he slides in at twice his size. The narration announces him and his line goes in the top box under his name. He leaves, the effect text and "Kriittinen osuma!" follow, and the hit does `critical.extraMin`–`extraMax` (5–10) more damage while the stage shakes. The first character is the Pääkirjoitustoimittaja, on the reply "Veronkorotus". Later (on request) the shipped chance became 1, so a trigger always fires when its hit does damage, and an answer can carry a list of triggers, one of which is picked at random. Adding more is a JSON file plus a sprite (see `src/data/debate/README.md`).
- **May become a surprise minigame inside the quiz**, depending on how it feels once playable. The game is built so it can run both standalone and embedded (section 5.2), but embedding is not part of this plan's scope.

---

## 1. What the quiz branch tells us (reuse, don't reinvent)

The quiz uses **no JS framework**. It is Astro plus plain TypeScript, and the game follows the same approach:

| Concern          | Quiz approach                                                                                  | Game equivalent                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Routes           | Thin wrappers `src/pages/{,sv/,en/}testi/index.astro` render `components/pages/QuizBody.astro` | Thin wrappers per locale render `components/pages/DebateBody.astro` |
| Content          | JSON in `src/data/quiz/*.json`, `{fi,sv,en}` per string, `needsReview` flag, "TODO" allowed    | `src/data/debate/**`, same string shape (section 3.1)               |
| Pure logic       | `src/lib/quiz/*.ts` (scoring, flow, url), no DOM, unit tested with vitest                      | `src/lib/debate/*.ts`: the whole battle engine, no DOM              |
| Client code      | `src/scripts/quiz/*.ts`; markup is server-rendered, the script only wires behaviour            | `src/scripts/debate/*.ts`                                           |
| Art              | Code-generated SVG (`bonusArt.ts`), no raster assets                                           | Pixel sprites as string grids rendered to inline SVG                |
| Dev-only preview | `src/pages/[lab].astro` serves `/quiz-lab/` only in dev or when `NOINDEX=true`                 | Add `/debate-lab/` the same way                                     |
| Tests            | `tests/unit/quiz-*.test.ts`, `tests/e2e/quiz*.spec.ts`                                         | `tests/unit/debate-*.test.ts`, `tests/e2e/debate.spec.ts`           |
| Validation       | `scripts/validate-translations.ts` walks `src/data/quiz` (reports TODO/needsReview)            | Extend it to also walk `src/data/debate`                            |
| Launch gating    | `noindex` plus excluded from the sitemap in `astro.config.mjs` until launch                    | Same, for the game's URLs                                           |
| Preview CI       | `.github/workflows/preview-pages.yml` builds a GitHub Pages preview per branch                 | Already copied into this branch (section 9)                         |

**Decision: no UI framework** (no React/Preact). The game is a small state machine, a text box and a grid of buttons. This keeps the bundle tiny, matches the quiz, and needs no new dependencies (AGENTS.md asks us to ask before adding any).

## 2. Hard constraints

- Static output only, no backend, no saved data. Nothing about the player's choices is stored or sent (no localStorage, cookies or analytics payloads).
- The game itself makes no third-party requests: its font and everything else is served from our own origin. (The site-wide layout, `BaseLayout.astro`, still loads Hanken Grotesk from Google Fonts and Font Awesome from cdnjs on every page, the game page included. Changing that is a site-wide decision outside this plan.)
- Original pixel art only. No Pokémon sprites, music, logos or names. No real politicians or party logos.
- Content rules from the spec: positions, not people; no slurs or jokes about ethnicity or immigrants.
- Accessibility: every action reachable by tap, click and keyboard (arrows plus Enter/Space). Real `<button>`s, live-region narration for screen readers, `prefers-reduced-motion` replaces typing and the hit flash with instant changes. Sound is off by default with a mute toggle.
- Don't invent facts or copy beyond what's needed. Translations drafted by Claude are marked `needsReview` for sv (and en where the Finnish wording is idiomatic and hard to render); Finnish is the source of truth.

## 3. Architecture

### 3.1 Data (`src/data/debate/`): built to be edited

Goals: a non-developer can change a line, add a reply, add an attack or delete one by editing or adding a single small file, and the checks tell them immediately what is wrong. Nothing in the code refers to a specific attack by name.

#### Layout

```
src/data/debate/
  config.json                      structure rules, typing speed, and the difficulty presets (section 3.5)
  ui.json                          narration and UI strings (intro, prompts, endings, buttons)
  enemies/
    kansalliskonservatiivi/
      enemy.json                   name, status label, intro line, sprite id
      enemy-attacks/               the enemy's attacks (he uses 4 per battle)
        bensapopulismi.json        one file per attack
        velkakortti.json
        eu-kritiikki.json
        maahanmuutto.json
      player-attacks/              the player's attacks and the enemy's possible comebacks
        huoltovarmuus.json         one file per player attack
        kotimainen-ruoka.json
        ihmisoikeudet.json
        vihrea-teollisuus.json
        ilmastokriisi.json
        luonnonsuojelu.json
```

Adding an attack is dropping a new JSON file in `enemy-attacks/` or `player-attacks/`; removing it is deleting the file; reordering is not needed because order is random (the player's grid is ordered by an optional `order` number, else by filename). The loader reads the folders with Vite's `import.meta.glob`, so no index file needs updating and no new dependency is needed. A new enemy is a new folder under `enemies/`.

#### File shapes

An enemy attack (`enemy-attacks/maahanmuutto.json`):

```json
{
  "announce": { "fi": "MAAHANMUUTTOA", "sv": "TODO", "en": "TODO" },
  "line": { "fi": "Käynnissä on väestönvaihto!", "sv": "TODO", "en": "TODO" },
  "replies": [
    {
      "id": "talous",
      "label": { "fi": "Talous", "sv": "TODO", "en": "TODO" },
      "quality": "strong",
      "say": {
        "fi": "Suomi tarvitsee maahanmuuttoa, tätä sanoo myös elinkeinoelämä.",
        "sv": "TODO",
        "en": "TODO"
      },
      "reaction": { "fi": "...", "sv": "...", "en": "..." }
    }
  ]
}
```

A player attack (`player-attacks/huoltovarmuus.json`):

```json
{
  "label": { "fi": "Huoltovarmuus", "sv": "TODO", "en": "TODO" },
  "say": {
    "fi": "Jokainen litra tuontiöljyä tekee meistä riippuvaisia muista. Oma energia on maanpuolustusta!",
    "sv": "TODO",
    "en": "TODO"
  },
  "defenses": [
    {
      "quality": "medium",
      "say": { "fi": "Ydinvoimaa sitten! Ei tuulimyllyjä!", "sv": "TODO", "en": "TODO" }
    },
    { "quality": "weak", "say": { "fi": "Turve on kotimaista!", "sv": "TODO", "en": "TODO" } }
  ]
}
```

Rules that keep the files simple:

- `quality` is one of `strong | medium | weak` (Finnish labels Tehokas / Kohtalainen / Heikko appear only in docs and the lab page). Damage and every other difficulty number live in `config.json`, never in the content files.
- **A player attack's tier (Vahva / Hyvä / Heikko) is derived from its defenses**, not stored, so the file can't contradict itself. The lab page and `npm run debate:report` show the derived tier and expected damage for every attack, so someone tuning copy sees the effect at once.
- Ids are optional and default to the file name/position; labels are the only thing the UI shows.
- Every text field is `{ fi, sv, en }`, optionally with `"needsReview": ["sv"]`, exactly like the quiz.

#### Validation (the safety net for frequent edits)

One shared validator (`src/lib/debate/validate.ts`) used by a unit test, by `scripts/validate-translations.ts` and by a `npm run debate:report` command. It fails with a message that names the file and the rule, for example `enemies/kansalliskonservatiivi/enemy-attacks/velkakortti.json: replies need exactly 1 strong, 1 medium, 2 weak (found 2 strong, 1 medium, 1 weak)`.

The rules come from `config.json`, not from the code, so changing the game shape is a config edit:

- every attack has `repliesPerAttack` replies (default 4) with the quality mix from `config.replyMix` (default 1 strong, 1 medium, 2 weak);
- every player attack has `defensesPerAttack` defenses (default 4) and at least one `strong`;
- each enemy has at least `rounds` attacks (default 4) and at least `playerAttackSlots` player attacks (default 6, the 2×3 grid); having more than needed is fine, the game draws a random subset, so adding a 5th enemy attack just works;
- button labels are at most `maxLabelLength` (17) characters, in every language. The spec says 15, but its own player attack labels "Kotimainen ruoka" (16) and "Vihreä teollisuus" (17) are longer, and both grids have the same two-column width, so the limit is 17 until the Phase 2 font lab shows what really fits;
- all three languages present; `TODO` and `needsReview` are allowed but listed in the report, like the quiz.

The balance test (section 6) runs on the real data, so a content edit that wrecks the difficulty fails CI with the numbers shown.

#### 3.1.1 Fix: MAAHANMUUTTO "Rasismi" reply

The spec's "Rasismi" reply (player: "Kasvisruoka on tulevaisuutta!", enemy: "Ja nyt viedään makkarakin! Kuulitteko?") was a copy-paste mix-up. It is replaced by a weak reply that makes sense and fits the spec's pattern (a green-voter instinct that backfires, the enemy deflects with a grain of truth, no joke about immigrants):

| Button  | Quality | Player says                | Enemy reacts                                                |
| ------- | ------- | -------------------------- | ----------------------------------------------------------- |
| Rasismi | Heikko  | Tuo on rasistista puhetta! | Heti rasistiksi haukutaan. Siksi tästä ei saa puhua ääneen. |

Marked `needsReview` in the data; Swedish and English follow the same meaning. The only change is this reply, quality and role in the 1/1/2 mix stay as in the spec.

### 3.2 Engine (`src/lib/debate/`): pure and fully unit tested

- `types.ts`, `loader.ts` (reads the data via `import.meta.glob`, derives tiers), `validate.ts`.
- `rng.ts`: injectable RNG (`() => number`) plus a seeded one (mulberry32) for tests.
- `damage.ts`: `damageFor(side, quality, difficulty)`; `difficulty.ts` resolves a preset (with `extends`), validates it and applies dev-only overrides.
- `battle.ts`: an explicit state machine, `step(state, input) -> { state, events }`. Phases: `intro → roundStart → enemyAttack → replyPrompt → replyResolved → attackPrompt → attackResolved → (next round | ending)`. It:
  - draws `rounds` enemy attacks at random without repeats from however many exist;
  - shuffles each attack's replies;
  - tracks used player attacks (each once);
  - picks the enemy defense uniformly at random;
  - applies damage and checks for KO **immediately after each hit** (a KO in the enemy half ends the battle before the player's attack);
  - ends after the last round with win / lose / tie on points.
- `ending.ts`: result kind (`koWin`, `koLose`, `pointsWin`, `pointsLose`, `tie`) and the strong-reply count ("Täydelliset vastaukset: 3/4").

The engine emits **events** (`say-bottom`, `say-top`, `effect`, `drain-bar`, `shake`, `blink`, `end`) that the UI plays back. The engine has no timing and the UI has no rules.

### 3.3 UI (`src/components/` + `src/scripts/debate/`)

- `components/DebateGame.astro`: the self-contained game (the 240×256 stage, boxes, status boxes, sprites, mute toggle). It takes a `locale` prop and puts its locale-specific data into a `<script type="application/json">`, the way `BonusGame.astro` does, so the script ships no copy.
- `components/pages/DebateBody.astro`: the standalone page: `BaseLayout`, title, short intro, `<DebateGame>`, noscript fallback.
- `scripts/debate/play.ts`: `playDebate(root, options)`: wires engine to DOM and resolves with the result (section 5.2).
- `scripts/debate/typewriter.ts`: letter-by-letter text; a tap or key completes the line first, then advances. Instant under reduced motion.
- `scripts/debate/menu.ts`: 2×2 reply grid and 2×3 attack grid; roving focus, arrow keys, cursor arrow, used attacks greyed (`aria-disabled`, not removed).
- `scripts/debate/audio.ts`: optional WebAudio chiptune bleeps generated in code (no audio files); mute toggle; silent until the first user gesture.
- Narration is mirrored into an `aria-live="polite"` region.

### 3.4 Rendering

Fixed **240×256 logical pixel** stage (taller than the Game Boy’s 10:9, so the two sides sit apart and the option rows are far enough apart to tap), DOM + CSS, not `<canvas>`, so buttons, focus and screen readers work. Scaled with CSS `zoom` by **whole numbers** from 2× up (`floor(min(width/240, height/256))`); below 2× (portrait phones) by the largest eighth that fits, because a whole number would leave a phone at an unreadable 1× (`src/scripts/debate/scale.ts`). Text and sprites are vector, so fractional zoom stays sharp. Pixelated rendering with `image-rendering: pixelated` and `shape-rendering="crispEdges"`. Palette as CSS custom properties: `#0F380F #306230 #8BAC0F #9BBC0F`; all game UI uses only these four. Game CSS is scoped under a `.debate` root so it can't leak into a host page.

### 3.5 Difficulty: one place, easy to turn

The spec says "all numbers are tunable in one config object", and we expect to retune after playing. So difficulty is data, not code, and changing it never touches the attack/reply content.

**`config.json` holds named presets** and says which one ships:

```json
{
  "difficulty": "normal",
  "difficulties": {
    "spec": { "...": "frozen copy of the spec's numbers, used only by tests" },
    "easy": { "...": "..." },
    "normal": {
      "rounds": 4,
      "player": {
        "kannatus": 100,
        "baseDamage": 30,
        "damage": { "strong": 0, "medium": 0.5, "weak": 1 }
      },
      "enemy": {
        "kannatus": 100,
        "baseDamage": 30,
        "damage": { "strong": 0, "medium": 0.5, "weak": 1 }
      },
      "enemyDefenseWeights": { "strong": 1, "medium": 1, "weak": 1 },
      "tieMargin": 0
    },
    "hard": { "...": "..." }
  }
}
```

The knobs, in the order you will likely reach for them:

| Knob                                     | What it changes                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `player.kannatus` / `enemy.kannatus`     | Starting health of each side (a head start for either)                                                                                                                                              |
| `player.baseDamage` / `enemy.baseDamage` | Size of a full hit taken by that side (the spec's 30)                                                                                                                                               |
| `*.damage.strong / medium / weak`        | Share of the base damage that lands per reply quality (the spec's 0 / 0.5 / 1). Separate per side                                                                                                   |
| `rounds`                                 | Battle length (and the quick variant for a possible quiz minigame, section 5.2)                                                                                                                     |
| `enemyDefenseWeights`                    | How likely the enemy's strong / medium / weak defenses are to be picked. Equal weights is the spec's "uniform random"; raising `strong` makes the enemy harder to hurt without editing any defenses |
| `tieMargin`                              | Points difference that still counts as a tie on the last round (0 = exact tie only)                                                                                                                 |

Presets can also extend each other (`"extends": "normal"` plus overrides), so "hard" is only a few lines.

**How we tune it:**

- **Switch the shipped difficulty** by changing one word (`"difficulty": "normal"`). Edit a number, push, and the CI preview shows the new feel.
- **Compare presets in the preview:** in dev and in `NOINDEX` builds (the GitHub Pages previews) `?difficulty=easy|normal|hard` overrides the preset. The page only reads the parameter when the server rendered it with `data-debate-preview-params` (dev and `NOINDEX` builds), so production always uses the config's value; the preview shows a small note naming the preset in use. `?special=<id>` works the same way: it starts a scene in which that special character steps in on the first reply (the debate lab links to it).
- **See the numbers before playing:** `npm run debate:balance` (optionally `-- --difficulty hard`, or `--set player.damage.medium=0.4` for a one-off experiment without editing files) runs thousands of simulated battles and prints, for several play styles (perfect, mostly good, all medium, random, "answers on green instinct"), the win, tie and loss rates and the average final KANNATUS of both sides. The same table appears in `/debate-lab/` with live number inputs, so you can try a change and see the effect on the win rates before pushing.
- **Guardrails, not handcuffs:** the balance test (section 6) asserts the exact spec numbers only for the frozen `spec` preset (it protects the engine's maths). For the shipped preset it only enforces loose guardrails stored next to it in `config.json` (for example "perfect play wins at least 95%", "random play wins under 15%"), so tuning stays free and a change that makes the game unwinnable or trivial is still caught. Guardrails are config too; edit them when you deliberately change the design.
- A player-facing difficulty selector is possible later (the presets already exist), but is not planned. The game's stance is that the first attempt often fails and retrying is one tap.

## 4. Art and font (no designer, no third parties)

- **Sprites** as arrays of strings (one char per pixel: digits 0–3 = palette shade, `.` = transparent) in `src/lib/debate/sprites.ts`, converted to inline SVG `<rect>` runs. Player from behind (bottom left), enemy from the front (top right): a generic mid-aged man in a fleece vest and cap, original design. The enemy's sprite id comes from `enemy.json`, so a new enemy brings a new sprite entry.
- Animations by CSS class: `flash` (the hit avatar turns fully transparent and back, three times in a second, while its bar drains; this replaced the spec's shake and status blink on request), slide-in at the intro. Bars drain with `steps()` easing to look 8-bit.
- **Self-hosted font.** One pixel font under an open licence (SIL OFL), committed as a subsetted `woff2` in the repo with its licence text next to it, loaded by an `@font-face` in our own CSS with `font-display: swap`. It must have **ä, ö and å** (Swedish needs å). No Google Fonts link, no npm font package, so no new dependency. The font file is imported through Astro's asset pipeline so its URL respects `BASE_PATH` in branch previews. **Chosen in Phase 2: Jersey 10 at 12 px** (12 px line height). Compared on `/debate-lab/` against Pixelify Sans, Silkscreen and Micro 5, measuring every battle text in all three languages against its box: Jersey 10 fits everything (widest label 82 of 97 px), has unambiguous digits (Pixelify's 5 reads as S) and lowercase (Silkscreen is capitals only), and is narrow enough that sv/en lines wrap less. VT323 and Press Start 2P were ruled out by glyph width before the lab. The candidates stay in the lab for comparison.
- The quiz's bonus level loads Patrick Hand from Google Fonts; that is the quiz's business and the game does not depend on it.

## 5. Routes, languages and integration

### 5.1 URLs

One route per language, thin wrappers that hardcode the locale (AGENTS.md; no `[[...locale]]` catch-all):

| Language | URL                 | File                                    |
| -------- | ------------------- | --------------------------------------- |
| fi       | `/debaattipeli/`    | `src/pages/debaattipeli/index.astro`    |
| sv       | `/sv/debaattipeli/` | `src/pages/sv/debaattipeli/index.astro` |
| en       | `/en/debaattipeli/` | `src/pages/en/debaattipeli/index.astro` |

`BaseLayout` already emits `hreflang` alternates from the `path` prop, so the three pages are linked as alternates. A small language note appears on the page if any string in that locale is still `TODO` or `needsReview` (falls back to Finnish for `TODO` strings rather than showing the placeholder).

`/debate-lab/` is added to `src/pages/[lab].astro` (dev and `NOINDEX=true` only). Until launch: `noindex` on all three pages and excluded from the sitemap in `astro.config.mjs`, next to the quiz entries. Nav/Footer entry only at launch.

### 5.2 Built to be embeddable (possible quiz minigame)

You may later turn this into a surprise minigame between quiz questions, depending on how it feels. That decision comes after you've played it, so the plan keeps the door open without building the integration now:

- **Standalone-or-embedded API** (built in Phase 3). `playDebate(root, { locale, enemy?, difficulty?, rng?, reduceMotion?, signal? })` plays one battle on a `DebateGame` stage and resolves with the `BattleResult` (kind, both final KANNATUS values, strong replies) when the player leaves the end screen, much like the quiz's `playBonus(overlay, reduce, onReturn)`. The standalone page loops it for "Pelaa uudelleen"; a host page can call it once. All DOM access stays inside `root`, every listener is tied to the `signal` (aborting ends the battle and removes them), and CSS is scoped under `.debate`.
- **Separate component.** `DebateGame.astro` renders only the game; `DebateBody.astro` is the page around it. A quiz page could include `DebateGame` in an overlay like `BonusGame.astro` does.
- **Length is configuration.** `config.rounds` already drives the battle. A "quick" profile (for example 2 rounds, a 3-minute or shorter game) is a config object, and the balance test is parameterised by profile, so if the full 5-minute battle feels too heavy for the quiz we can ship a lighter variant without code changes. A profile is chosen with an option to `playDebate`, never from the URL in production.
- **Unscored and private.** Nothing the game does touches quiz answers or scores, and nothing is stored or sent, same as the quiz's bonus level.
- **What is deliberately not in this plan:** quiz flow changes, a trigger point in `flow.ts`, or cross-links. If you decide to embed it, that is a small follow-up on top of the quiz branch once both have landed.

## 6. Balance and tests

**Unit (vitest)**, `tests/unit/debate-*.test.ts`:

- `debate-data`: runs the validator on the real data (shape, quality mixes, counts, label lengths, all three languages present), the derived tiers are shown by `debate:report` rather than asserted, so retiering an attack by editing its comebacks is a normal content edit. The spec's tiers are asserted on a frozen fixture copy of the spec's qualities (`debate-balance`). Also validator tests on small broken fixtures, proving each rule produces a clear error.
- `debate-difficulty`: presets resolve and `extends` works; unknown or out-of-range knobs give a clear error; `enemyDefenseWeights` shift the pick frequencies as expected; a dev override never applies in a production build.
- `debate-battle`: no enemy attack repeats; each player attack usable once; KO ends the battle mid-round; the last round ends on points; tie ending; the same seed gives the same battle; damage table (0/15/30); works with more than the minimum number of attacks.
- `debate-balance`: Monte-Carlo (about 20 000 seeded battles per strategy). Against the frozen `spec` preset it checks the spec's expected values exactly (perfect play player 100 / enemy about 40; all-medium replies 40 / 40; random play about 25 vs 55). Against the shipped preset it checks only the loose guardrails from `config.json` and prints the measured numbers on failure. A shared simulation module (`src/lib/debate/simulate.ts`) backs this test, `debate:balance` and the lab.
- `debate-typewriter`: line completion and advance semantics.

**E2E (playwright)**, `tests/e2e/debate.spec.ts`, run for fi, sv and en: noindex; full battle by keyboard only; tap-only on a mobile viewport; used attacks greyed and not selectable; end screen shows the result, "Täydelliset vastaukset: n/4" (localised) and "Pelaa uudelleen" restarts in one tap; no hints on any end screen; mute toggle; reduced motion; the game's font served from our own origin; nothing in storage; language alternates present. Randomness is made deterministic with `page.addInitScript` stubbing `Math.random`. The only URL parameter is the dev/preview-only `?difficulty=` (section 3.5); one e2e checks that production ignores it. Phase 3 added the keyboard-only and tap-only full battles, used attacks, the end screen and restart, and the storage check; mute and the reduced-motion details follow in Phases 4–5.

**Report commands:** `npm run debate:balance` (section 3.5) and `npm run debate:report` prints, per enemy, every attack and player attack with derived tier, expected damage, TODO/needsReview counts and the longest label per language. Useful when editing copy.

## 7. Phases

Each phase ends with `npm run format:check && npm run lint && npm run check && npm run validate:translations && npm run test && npm run build` green and a stop for review. One logical change per commit (Conventional Commits), pushed right after.

0. **Branch, CI, plan** (done): plan doc and the preview workflow.
1. **Data, validator and engine** (done): `config.json` with the `spec`, `easy`, `normal` and `hard` presets and guardrails, the per-file enemy data with all spec copy in Finnish (with the fixed "Rasismi" reply), sv/en drafts marked `needsReview`, `ui.json`; `src/lib/debate/*` (loader, validator, battle, rng); unit and balance tests; `debate:report` and `debate:balance`; extend `validate-translations.ts`. No UI yet.
2. **Shell, font and lab** (done): `DebateGame.astro`, `DebateBody.astro`, the 240×216 stage (now 240×256), palette, self-hosted font chosen in the lab, boxes, status boxes, placeholder sprites, `/debate-lab/` (including the live difficulty panel), routes for fi/sv/en, noindex and sitemap exclusion.
3. **Battle UI** (done): `playDebate` (with the dev/preview `?difficulty=` switch) wiring engine to DOM: typewriter, 2×2 and 2×3 menus, keyboard and touch, KANNATUS bars, effect texts, endings, end screen, restart. Decisions made while building it:
   - The pacing rules (which box, when to wait for a tap) are a pure module, `src/lib/debate/playback.ts`, unit tested; the DOM layer (`scripts/debate/view.ts`) only performs its steps.
   - The battle starts by itself once the stage is at least half on screen (a start button, "Aloita väittely", was dropped on request), so its first lines aren't typed out below the fold. The enemy's speech box stays hidden until he first speaks; it empties (with its label) at each new round and when the player attacks, until he answers.
   - Every line waits for a tap, click, Enter or Space (a ▼ cue shows when the line is done; a tap mid-line shows the whole line first). Effect texts drain the bar straight away, then wait.
   - Phase labels (added after Phase 3 on request) sit on each box's top edge: the enemy's box shows his move ("Hyökkäys: Velkapaniikki", then "Puolustus" when he answers the player's attack), the bottom box the player's ("Vastaus: Veroparatiisit", "Hyökkäys: Huoltovarmuus"). The prompts became those labels instead of typed lines: "Millä teemalla vastaat?" and "Millä teemalla hyökkäät?" sit over their grids, which appear at once (this replaces the spec's "Miten vastaat?" / "Millä hyökkäät?" lines). A new round and the ending clear the labels. The engine emits `phase` events for this, and each enemy attack has a `name` alongside its `announce`.
   - Option grids ignore picks for their first 300 ms and the end screen for 800 ms, so tapping through text can't pick an answer or skip the result by accident.
   - Used attacks stay in the grid, struck through and announced as used to screen readers; picking one does nothing.
   - The zoom also leaves room for the site's sticky nav, so the whole stage fits the screen once started.
4. **Art and juice** (done): final sprites, intro slide-in, bar drain, optional chiptune audio and mute, reduced-motion variants. Decisions:
   - **Sprites** (`src/lib/debate/sprites.ts`), original pixel art drawn as text grids: the national conservative from the front (48 × 50: combed hair with a side parting, frown, clean-shaven, dark suit, white shirt and tie) and Markkinavihreä, a woman seen straight from behind (56 × 50: shoulder-length bob with a centre parting, light suit). Redrawn twice after Phase 4 on request: both in suits, the conservative without the cap and flannel and then without the mustache (his mouth now reads clearly), the player as a woman, without the raised hand and without a turned head. Larger than the Phase 2 placeholders, closer to Game Boy proportions; the layout keeps both clear of the status boxes and labels.
   - **Entrance:** both sides slide in from their own edge as a battle starts (an `enter` event from the engine), before the opening line. A playable stage is rendered with both off stage, so nothing flashes before the battle; without JavaScript they're shown as usual.
   - **Hits** flash the avatar (from the earlier request) and the bar drains meanwhile; the beaten enemy slides out (earlier request).
   - **Sound** (`src/scripts/debate/audio.ts`): square-wave chiptune made with the Web Audio API, no audio files: a quiet blip while text types, a tick when the cursor moves, a chirp on a pick, a thud for hits, a falling wobble for backfires, a jingle when he flees and a falling one when the player loses. Off by default behind a toggle under the stage ("Äänet päälle" / "Äänet pois"); the AudioContext is only created by that click, and nothing is remembered between visits.
   - **Reduced motion:** no typing, flashing, sliding or blinking cue; text and sprites simply appear. Sound is separate (the toggle).
5. **Polish:** e2e in all three languages, mobile portrait pass, accessibility pass (screen-reader narration, focus order), Lighthouse check, README entry, a short "how to edit the game's content" section in the docs.
6. **Launch checklist:** sv/en reviewed by a human and `needsReview` cleared (after the game works, not before), remove noindex and the sitemap exclusion, add Nav/Footer entry, PR to `main` for human review.

You play the game after Phase 3 (the preview URL from CI works for that) and tune difficulty from there; the quiz-embedding decision comes after Phase 4 at the latest.

## 8. Risks

- **Font width:** Finnish and Swedish compounds in a 240 px stage. Mitigation: font comparison in Phase 2 with the longest labels per language, labels capped at 17 characters, enemy name abbreviated as in the spec ("KANSALLISKONS.").
- **Long lines in boxes:** the longest player lines (about 100 characters, Swedish tends to be longer) must fit the bottom box in 2–3 lines. Mitigation: validator reports line length per language; the lab shows the longest lines.
- **Balance drift when copy is edited:** covered by the Monte-Carlo guardrails, `debate:balance` and `debate:report`.
- **Random variance feels unfair:** the enemy's random defense is by design; if playtesting says it feels bad, `enemyDefenseWeights` softens it without touching content.
- **Translation quality:** sv and en are drafts until a human reviews them (`needsReview`); satire and political idiom ("verohelvetti", "väestönvaihto") translate poorly, so those get flagged for a native reviewer.
- **Merge conflicts with the quiz branch** in `astro.config.mjs` (sitemap filter), `scripts/validate-translations.ts`, `src/pages/[lab].astro` and the README. They are small; resolve by rebasing onto `main` once the quiz lands. Don't copy the quiz's versions of these files in advance.

## 9. CI

`.github/workflows/ci.yml` (on `main`) runs format, lint, check, translations, unit tests, build, `check:og` and e2e on every PR. This branch also carries `.github/workflows/preview-pages.yml`, copied unchanged from the quiz branch, so each push builds a `noindex` GitHub Pages preview at `/<repo>/<branch-slug>/debaattipeli/`. `astro.config.mjs` on `main` already reads `BASE_PATH`, and the game uses no hard-coded absolute URLs (its font goes through Astro's asset pipeline), so the previews work as they are; the preview also includes `/debate-lab/`. The two branches' workflow files are identical, so merging either first is conflict-free.

## 10. Resolved questions

1. **URLs:** `/debaattipeli/`, `/sv/debaattipeli/` and `/en/debaattipeli/`, following the site's convention (the same Finnish slug in every language, like `/en/manifesti/` and the quiz's `/sv/testi/`), which the layout's hreflang tags and the Nav language switcher rely on. Translated slugs were considered and dropped in Phase 2.
2. **Cross-linking with the quiz:** none for now. Revisit after playing the game (section 5.2).
