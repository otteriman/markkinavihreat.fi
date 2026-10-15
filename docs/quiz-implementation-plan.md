# "Oletko markkinavihreä?" quiz: implementation plan for Claude Code

This document is the spec for building the "Are you a market green?" quiz on markkinavihreat.fi. It is written for Claude Code: read it fully before writing any code, then work through the phases in order. Stop at the end of each phase for human review.

---

## 1. Context

- **Site:** markkinavihreat.fi, an existing static site that appears to be built with **Astro** (asset paths under `/_astro/`). It has Finnish (default, `/`), Swedish (`/sv/`) and English (`/en/`) versions.
- **Owner:** Markkinavihreät, a network of market-liberal and social-liberal members inside the Finnish Green League (Vihreät). The site is not an official Green League site.
- **Goal of the quiz:** reach value-liberal, market-friendly people who don't yet know Markkinavihreät, get them to share their result, and convert interested visitors to the newsletter or WhatsApp group.
- **Tone:** fair, transparent, playful, never mocking. The audience spots leading questions immediately, so neutrality and an open scoring method matter more than polish.
- **Not a voting advice application.** The quiz never recommends a party or a candidate.

## 2. How to use this plan with Claude Code

1. Put this file in the repo root (or `docs/`), then start Claude Code in the repo.
2. First prompt: _"Read quiz-implementation-plan.md. Do Phase 0 only and report back."_
3. After each phase, review the diff, run the site locally, and then ask for the next phase: _"Phase N looks good. Continue with Phase N+1."_
4. Content (question wording, facts, type descriptions) lives in data files, so non-developers can edit it later without touching components.

## 3. Hard constraints

These apply to every phase. Claude Code must not violate them, even if a later instruction seems to suggest otherwise.

- **No backend, no database.** All scoring happens in the browser.
- **Answers are never sent anywhere or stored.** No localStorage of answers, no cookies, no answer payloads in analytics. Political opinions are special-category data under GDPR Article 9; keeping them in the browser avoids processing them at all.
- **Newsletter signup is separate** from the results and never includes scores.
- **Analytics must be cookieless** (Plausible or Umami) and only record events listed in section 10.
- **Accessibility: WCAG 2.1 AA.** Every gesture (swipe, slider) has a button or keyboard alternative.
- **Respect `prefers-reduced-motion`:** with it set, all animations are replaced by instant transitions.
- **Performance:** quiz page JS ≤ 50 kB gzipped (excluding images), Lighthouse mobile performance ≥ 90.
- **Follow the existing repo's conventions** (framework integrations, styling approach, folder layout, i18n pattern). Don't add a UI framework if the repo already has one; if it has none, prefer Preact or vanilla TypeScript.
- **Don't invent facts.** Fact cards with missing numbers stay as `TODO` placeholders until a human fills them in.
- **No designer.** There is no budget for a designer. Claude Code creates all visual assets in code: the tree, finale illustrations, type visuals and share images, as hand-written or procedurally generated SVG plus CSS (section 7.4). Don't depend on raster AI image generators, because their output can't be animated stage by stage and is hard to keep consistent across many images.

## 4. Routes

| Language | Quiz start  | Result pages                         |
| -------- | ----------- | ------------------------------------ |
| Finnish  | `/testi/`   | `/testi/tulos/[type]-[bucket]/`      |
| Swedish  | `/sv/test/` | `/sv/test/resultat/[type]-[bucket]/` |
| English  | `/en/quiz/` | `/en/quiz/result/[type]-[bucket]/`   |

Adapt the Swedish and English slugs to match the existing i18n routing if it differs.

**Why result pages are static per type and bucket:** social media crawlers don't run JavaScript and ignore query strings when choosing `og:image`. Each result page is therefore pre-rendered with its own preview image. The exact scores travel in the query string and are rendered client-side:

```
/testi/tulos/pigou-80/?m=82&y=79&v=85
```

- `type`: one of the six type slugs in section 6.
- `bucket`: the overall score rounded to the nearest 10 (0, 10, …, 100).
- `m`, `y`, `v`: exact axis scores (integers 0–100). Validate and clamp them. If they are missing or invalid, show the type and bucket only, with a "Take the quiz" call to action.
- Optional friend comparison: `&cm=..&cy=..&cv=..` (the challenger's scores).

Generate only valid type/bucket combinations: for example, `pigou` requires all axes ≥ 60, so its bucket is ≥ 60.

## 5. Questions and data model

### 5.1 Data file

Store all content in one file per concern under the repo's data/content folder, for example `src/data/quiz/`:

- `questions.json`: questions, axes, direction, answer UI type, after-question card
- `types.json`: result types and their copy
- `ui.json`: UI strings (buttons, progress, reactions, share texts)

Each text field has `fi`, `sv`, `en` keys. **Finnish is the source of truth.** English drafts are below. Swedish starts as `"TODO"` unless a human provides it; Claude Code may draft Swedish, but must mark every drafted string with a `"needsReview": true` flag.

Suggested TypeScript types:

```ts
type Lang = 'fi' | 'sv' | 'en'
type Axis = 'markets' | 'environment' | 'freedom'
type AnswerUI = 'buttons' | 'swipe' | 'slider' | 'imageChoice'

interface Statement {
  id: string // 'q1' … 'q9'
  kind: 'statement'
  axis: Axis
  direction: 1 | -1 // +1: agreeing raises the axis score
  ui: Exclude<AnswerUI, 'imageChoice'>
  text: Record<Lang, string>
  after: AfterCard
  relatedLink?: { href: Record<Lang, string>; label: Record<Lang, string> }
}

interface Finale {
  id: 'q10'
  kind: 'finale'
  ui: 'imageChoice'
  text: Record<Lang, string>
  options: { id: string; label: Record<Lang, string>; markets: number; environment: number }[]
}

interface GuessInterlude {
  id: 'guess'
  kind: 'guess' // not scored
  after: 'q5'
  text: Record<Lang, string>
  min: number
  max: number
  answer: number
  reveal: Record<Lang, string>
}

type AfterCard =
  | { type: 'fact'; text: Record<Lang, string>; source: { label: string; url: string } | 'TODO' }
  | { type: 'reaction'; text: Record<Lang, string> }
  | { type: 'teaser'; text: Record<Lang, string> }
```

### 5.2 The ten questions (in display order)

Statements use a 5-point scale: strongly disagree (−2), somewhat disagree (−1), can't say (0), somewhat agree (+1), strongly agree (+2).

| #   | Axis        | Dir | UI          | Finnish (source)                                                                                  | English draft                                                                                   | After-question card                                                                                     |
| --- | ----------- | --- | ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | markets     | +1  | buttons     | Suurimmasta osasta yritystukia pitäisi luopua, vaikka se veisi joitakin työpaikkoja.              | Most corporate subsidies should be scrapped, even if some jobs are lost.                        | Fact: annual total of corporate subsidies in Finland. Source: VATT. **Number TODO.**                    |
| 2   | environment | +1  | swipe       | Ruuhkamaksut olisivat hyvä keino suurissa kaupungeissa.                                           | Congestion charges would be a good tool for large cities.                                       | Fact: congestion charges are used in, for example, London, Singapore and Gothenburg.                    |
| 3   | freedom     | +1  | slider      | Aikuisen pitäisi saada päättää itse päihteiden käytöstään, kunhan hän ei vahingoita muita.        | Adults should be free to decide on their own substance use, as long as they don't harm others.  | Reaction: "Tämä jakaa kansaa." / "This one divides the nation."                                         |
| 4   | markets     | −1  | swipe       | Vuokrasääntely on hyvä keino pitää asuminen kohtuuhintaisena.                                     | Rent control is a good way to keep housing affordable.                                          | Fact: what economists think about rent control. **Source TODO** (e.g. an economist survey).             |
| 5   | environment | −1  | buttons     | Ilmastotavoitteista voi joustaa, jos ne hidastavat talouskasvua.                                  | Climate targets can be relaxed if they slow economic growth.                                    | Teaser: "Olet jo yllättänyt meidät." / "You've already surprised us."                                   |
| –   | (guess)     | –   | slider      | Arvaa: mistä vuodesta lähtien Tukholmassa on ollut pysyvät ruuhkamaksut?                          | Guess: since what year has Stockholm had permanent congestion charges?                          | Reveal: 2007. Range 1990–2025. Not scored.                                                              |
| 6   | freedom     | −1  | slider      | Viranomaisille pitäisi antaa laajemmat valtuudet valvoa verkkoviestintää rikosten ehkäisemiseksi. | Authorities should get wider powers to monitor online communication to prevent crime.           | Reaction: "Rohkea veto!" / "Bold move!"                                                                 |
| 7   | markets     | +1  | swipe       | Osakesäästötilin sijoituskattoa pitäisi nostaa selvästi.                                          | The deposit cap of the equity savings account (osakesäästötili) should be raised substantially. | Fact: number of equity savings accounts in Finland. **Number and source TODO.**                         |
| 8   | environment | +1  | buttons     | Luontokadon pysäyttäminen on yhtä tärkeää kuin ilmastonmuutoksen torjunta.                        | Halting biodiversity loss is as important as fighting climate change.                           | Fact: share of threatened species in Finland. Source: the Red List of Finnish species. **Number TODO.** |
| 9   | freedom     | +1  | slider      | Työperäisen maahanmuuton pitäisi olla nykyistä helpompaa.                                         | Work-based immigration should be made easier than it is today.                                  | Reaction: "Viimeinen ennen finaalia." / "Last one before the finale."                                   |
| 10  | finale      | –   | imageChoice | Ilmastopolitiikassa luotan eniten…                                                                | In climate policy, I trust most in…                                                             | Drum roll, then the result reveal.                                                                      |

**Finale options**

| Option id | Finnish                                             | English                                         | markets | environment |
| --------- | --------------------------------------------------- | ----------------------------------------------- | ------- | ----------- |
| `price`   | …hintaan päästöille                                 | …putting a price on emissions                   | +2      | +2          |
| `bans`    | …kieltoihin ja tukiin                               | …bans and subsidies                             | −2      | +2          |
| `neither` | …en kumpaankaan, ilmastopolitiikkaa on jo tarpeeksi | …neither, there's enough climate policy already | 0       | −2          |

A short Finnish note in the source plan lists nine backup statements. They are not part of this build.

## 6. Scoring

Implement as a pure, fully unit-tested module, e.g. `src/lib/quiz/scoring.ts`.

```
p_i     = answer value (−2…+2) × direction   for statements
          option value for the axis            for the finale
          0                                    if skipped
n       = number of scored items on the axis:  markets 4, environment 4, freedom 3
axis    = round( (Σ p_i + 2n) / (4n) × 100 )   → integer 0–100
overall = round( (markets + environment + freedom) / 3 )
high    = axis ≥ 60
bucket  = round(overall / 10) × 10
```

**Result types** (evaluate in this order):

| Slug        | Rule                       | Finnish name        | English name        | Finnish one-liner                                                                |
| ----------- | -------------------------- | ------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `pigou`     | all three high             | Pigou'n perillinen  | Pigou's heir        | Olet markkinavihreä. Hinnoittele haitat, vapauta loput.                          |
| `liberal`   | markets + freedom high     | Klassinen liberaali | Classical liberal   | Vapaus on sinulle tärkein. Ilmastossa markkinaratkaisut voisivat yllättää.       |
| `ecologist` | environment + freedom high | Kaupunkiekologi     | Urban ecologist     | Luonto ja vapaus ensin. Tiesitkö, että päästökauppa on tehokkain ilmastotyökalu? |
| `engineer`  | markets + environment high | Vihreä insinööri    | Green engineer      | Uskot tehokkaisiin ratkaisuihin. Vapaus kuuluu samaan pakettiin.                 |
| `focused`   | exactly one high           | Yhden asian ihminen | Single-issue person | Sinulla on selvä painopiste. Katso, miten se liittyy kahteen muuhun.             |
| `free`      | none high                  | Vapaa sielu         | Free spirit         | Et mahdu laatikoihin. Hyvä, ei mekään.                                           |

English one-liners: draft natural English equivalents, keeping the same friendly tone.

**Required unit tests (Vitest, or the repo's existing runner):**

- All "strongly agree" answers do not produce 100 on every axis, because reversed items pull scores down.
- All neutral answers give 50 on every axis.
- Maximum and minimum possible answers produce 100 and 0 per axis.
- Each of the six types is reachable, with one fixture per type.
- Boundary: an axis of exactly 60 counts as high, and 59 does not.
- Bucket rounding: 74 → 70, 75 → 80.
- URL parsing clamps out-of-range and non-integer values.

## 7. Quiz flow and UI

### 7.1 State machine

```
intro → q1 → after1 → q2 → after2 → … → q5 → after5 → guess → guessReveal
      → q6 → … → q9 → after9 → q10 → drumroll → reveal → navigate to result page
```

- One question per screen, mobile first, thumb-reachable controls in the lower half.
- **Back button** on every question (changes the earlier answer). No back from the result page into the quiz; offer "Take again" instead.
- **Skip** ("Ohita") is allowed on statements and counts as 0.
- Progress lives in the growing tree (7.3), plus a visually hidden "Question 3 of 10" for screen readers.
- Total time target: about 2 minutes.

### 7.2 Answer UIs

All map to the same −2…+2 value.

- **buttons:** five stacked buttons with the scale labels.
- **swipe:** a card. Swipe right = agree, left = disagree, with a short swipe giving ±1 and a long swipe ±2 (threshold about 40 % of the card width). Always show five buttons under the card as an alternative. Use pointer events, and make keyboard arrows work.
- **slider:** native `<input type="range" min="-2" max="2" step="1">` with visible labels, plus a "Next" button. It starts at 0, and the user must interact or press Next.
- **imageChoice:** three large illustrated cards (finale only). Draw each illustration as simple SVG in the same style as the tree (for example a price tag, a crossed-out sign and a shrug), or base it on an MIT-licensed icon set such as Lucide or Phosphor.

### 7.3 Animations and surprises

- **Growing tree that reflects the answers:** an SVG tree with 10 growth stages, from sapling to full tree. It advances one stage per answered scored question and does not advance on the guess interlude. Every answer grows the tree by the same amount; the answers change _what kind_ of growth appears, never how much (section 7.5). Stage changes animate over ≤ 600 ms. At the reveal, the tree the user grew is their result, and the percentage and type name explain it.
- **After-question cards** (fact, reaction or teaser): slide in for ≤ 1.5 s total, then auto-advance. Tapping anywhere or pressing a key skips immediately. A fact card shows its source in small text with a link that opens in a new tab and does not auto-advance while focused.
- **Guess interlude:** slider answer, then the reveal animates the correct value on the same slider with a short "You were X years off" line.
- **Result reveal** (on the quiz page, before navigating):
  1. Drum roll, a CSS shake of the tree for about 800 ms.
  2. The tree's final stage appears.
  3. The overall percentage counts up from 0 over about 1.2 s.
  4. The three axis bars fill one after another (about 300 ms each).
  5. The type name fades in.
  6. Navigate to the static result URL with `history.replaceState` or a normal navigation. Avoid a visible reload flash, for example by rendering the result page with the same layout.
- **Reduced motion:** every step above becomes instant. Facts show until the user presses Next and do not auto-advance.
- No heavy animation libraries (no three.js, no WebGL). CSS and small TypeScript only. A tiny library is acceptable only if justified in the PR description.

### 7.4 Visual style and the AI workflow (no designer)

All visuals are made by Claude Code in code, so the style must be one that code produces well and that stays consistent.

- **Style:** flat and geometric, with rounded shapes and a limited palette: the site green `#6EB82A`, one darker green, a warm coin yellow and the site's text colour. No gradients, drop shadows or photographic detail. Must work in light and dark mode.
- **The tree is generated, not drawn by hand.** Write a deterministic recursive branching function with a fixed seed. Its inputs are `growth` (0–1) and the three axis scores (section 7.5). The same inputs must always produce exactly the same SVG. `growth` alone controls size: trunk height, branch depth and leaf count. Fruit appears only in the last three stages. The 10 stages are `growth` values in steps of 0.1.
- **Stage transitions:** new branches extend with a `stroke-dashoffset` animation, and leaves and coins scale in from 0 with a slight stagger.
- **Type visuals** are the same generator at full growth with representative scores: 85 for a high axis and 35 for a low one. For `focused`, use markets high and the other two low; for `free`, use 45 on all axes. These six trees are used for the link preview images and the lab page.
- **Finale and fact-card icons** use the same palette and stroke width as the tree.
- **Lab page:** a development-only route, `/quiz-lab/`, excluded from the production build. It shows all 10 stages side by side, the stage transitions, every after-question card, the result reveal on a loop, the six type variants and the OG image previews, in both light and dark mode. It also has a **trait explorer**: three sliders for the axis scores and one for growth, rendering the tree live.
- **Self-review loop:** after each visual change, take Playwright screenshots of the lab page, inspect them, and fix problems before reporting back. Check for overlapping shapes, clipped edges, unreadable text and inconsistent stroke widths. Also screenshot each axis at 0 and at 100 side by side and check that **both ends look equally appealing** (section 7.5).
- **Style options for humans:** at the start of Phase 4, produce three clearly different style options for the tree, for example geometric flat, single-weight line art and paper-cut layers. Show them on the lab page and wait for the humans to choose one before building the rest.

### 7.5 How the answers shape the tree

**Core rule: no answer is ever punished visually.** Every answer adds the same amount of growth. Each axis controls a trait with two ends, and both ends must look attractive. A smaller, barer or sadder tree after any answer would signal a "right" answer, invite gaming and break the quiz's neutrality.

| Axis        | Trait                | Low end (score near 0)                                            | High end (score near 100)     |
| ----------- | -------------------- | ----------------------------------------------------------------- | ----------------------------- |
| Markets     | Fruit type           | Apples                                                            | Coins                         |
| Freedom     | Crown shape          | Neatly pruned, rounded, symmetrical, like a well-kept garden tree | Wild, spreading, asymmetrical |
| Environment | Life around the tree | A tidy garden: mown lawn, a neat path, a bench                    | Flowers, bees and birds       |

- **Continuous, not binary.** Scores in between produce mixes: at markets 50, roughly half the fruit are coins. Crown shape interpolates smoothly between pruned and wild.
- **Environment is the riskiest axis.** "No flowers or birds" can easily look like a dying world. The tidy-garden end must be equally detailed, pleasant and full of life in its own way. Flag this axis specifically in the soft-launch feedback.
- **Running scores during the quiz.** After each answer, compute each axis over the items answered so far: `(Σ p + 2k) / (4k) × 100`, where `k` is the number of answered items on that axis, and 50 when `k = 0`. Trait expression also scales with `growth`, so changes are subtle early and fully visible at the reveal. This keeps people from reading the tree as live feedback on each answer.
- **The final tree uses only the final axis scores** (`m`, `y`, `v`), never individual answers. The result page and the challenge view can therefore redraw the exact tree from the URL alone.
- **Determinism:** the seed is fixed. Only the scores and growth change the output, so two people with the same scores get identical trees.

**Required tests:**

- The same inputs produce an identical SVG string.
- For a given `growth`, the tree's bounding-box height stays within ±3 % across all axis values. This proves answers don't change the tree's size.
- At 0 and 100 on each axis, the element count of the trait layer (fruit, garden or wildlife elements) differs by at most 30 %. This proves neither end is "empty".

## 8. Result page

Static pages per language × type × bucket (section 4), hydrated with the exact scores from the URL. Top to bottom:

1. The user's personal tree, redrawn from `m`, `y` and `v`, with the overall percentage, type name and type description. Without score params, show the type's representative tree.
2. Three labelled axis bars with scores.
3. Share buttons: native `navigator.share` on mobile, with fallback buttons for WhatsApp, LinkedIn, Bluesky, X, Facebook and "Copy link". The share text comes from `ui.json`, for example "Olen 82 % markkinavihreä. Entä sinä?"
4. "Challenge a friend": a link containing the user's scores as `cm/cy/cv`. When a friend finishes, their result page shows both trees and both score sets side by side.
5. Personalised nudge: for up to two statements where the user agreed (value ≥ +1, after direction), show that question's `relatedLink`. This needs the per-question answers, so pass them **only in the URL hash** (`#a=2,1,0,-1,…`). The hash is never sent to servers or analytics. If the hash is absent, skip this block.
6. Calls to action: newsletter signup (primary), WhatsApp group (existing link on the site), manifesto page.
7. "How this quiz works": the scoring explanation and all questions in a `<details>` element.
8. Footer note: this quiz is not a voting advice application and not an official Green League service.

## 9. Share images

- **Link preview images (1200 × 630):** generated at build time for each language × type × bucket. Use Satori + resvg (or `@vercel/og`-style tooling that runs at build time) through an Astro endpoint or a build script. Content: percentage (bucket value, for example "80 %"), type name, the type's representative tree (section 7.4), and `markkinavihreat.fi/testi`. Preview images can't show personal trees because they are built in advance. Set `og:image`, `og:title`, `og:description` and `twitter:card=summary_large_image` on each result page, following the meta pattern the site already uses.
- **Story image (1080 × 1920):** drawn client-side on `<canvas>` with the user's personal tree (the generated SVG drawn onto the canvas), the exact percentage and the bars. A "Save image" button downloads it, and on mobile it is offered via `navigator.share({ files })` where supported.
- Fonts and colours come from the site's existing theme (theme colour `#6EB82A`).

## 10. Analytics

Wrap analytics in `src/lib/quiz/track.ts`, exposing `track(event, props?)`. It does nothing if no provider is configured. The provider and site id come from environment variables.

| Event                 | Props                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| `quiz_start`          | `lang`                                                                |
| `quiz_question_view`  | `lang`, `q` (question id only, no answer)                             |
| `quiz_abandon`        | `lang`, `q` (last question seen; sent on `visibilitychange` → hidden) |
| `quiz_complete`       | `lang`, `type`, `bucket`                                              |
| `quiz_share`          | `lang`, `channel`                                                     |
| `quiz_cta`            | `lang`, `cta` (`newsletter` / `whatsapp` / `manifesto`)               |
| `quiz_challenge_open` | `lang`                                                                |

Never send individual answers or exact axis scores. Type and bucket are acceptable because they are coarse.

## 11. Newsletter form

- A separate component on the result page and quiz intro with an email field, a language selector (default = page language) and an unticked consent checkbox linking to the privacy notice.
- The provider is not chosen yet. Build the component against a small adapter (`subscribe(email, lang)`) with a no-op/mock implementation and a clear TODO.
- Never include quiz data in the request.

## 12. Quality checks

- **Unit tests:** scoring and URL parsing (section 6).
- **End-to-end (Playwright):**
  - Complete the quiz in all three languages and land on the correct result page.
  - Keyboard-only run-through.
  - A run with `prefers-reduced-motion: reduce` has no auto-advance.
  - Swipe questions can be answered with buttons only.
  - The result URL with tampered params is clamped and safe.
  - A test intercepts all network requests during a run and fails if any request body or URL contains answers or axis scores.
- **Lighthouse (mobile):** performance ≥ 90, accessibility ≥ 95, best practices ≥ 95 on the quiz and a result page.
- **Preview check:** after deployment to a preview URL, verify link previews with the Facebook Sharing Debugger, LinkedIn Post Inspector and a WhatsApp message. This is manual, so list it in the PR.

## 13. Phases

Stop after each phase and summarise what was done, what remains and any decisions needed.

**Phase 0: Repo reconnaissance (no code changes)**
Inspect the framework version, integrations, styling, i18n routing, layout components, meta/OG handling, deployment target, package manager and test setup. Report how the plan maps onto the repo, and propose any deviations (for example, route slugs or folder names).

**Phase 1: Data and scoring**
Create the types, `questions.json`, `types.json` and `ui.json` (fi + en filled, sv TODO or drafted with `needsReview`). Implement `scoring.ts` and URL encode/decode with full unit tests.

**Phase 2: Quiz flow, basic UI**
Build the quiz page in all three languages with the state machine, the four answer UIs, back and skip, after-question cards (static, no animation yet), the guess interlude, and navigation to the result URL. Placeholder styling must still follow the site's look.

**Phase 3: Result pages**
Add static generation for every language × valid type × bucket, hydration from the query string and hash, bars, comparison view, personalised links, CTAs, "How this quiz works" and the footer note.

**Phase 4: Visual style, animations and the tree**
First build the `/quiz-lab/` page with three tree style options (section 7.4) and stop for the humans to choose. Then build the chosen generated tree with 10 stages and answer-driven traits (section 7.5) with their tests, the trait explorer, the type variants, the finale illustrations, card transitions, the guess reveal and the full result reveal sequence, plus reduced-motion handling. Use the screenshot self-review loop before reporting.

**Phase 5: Sharing**
Add build-time OG images, per-page meta, share buttons, the canvas story image and the challenge-a-friend link.

**Phase 6: Analytics and newsletter**
Add the `track()` wrapper and events, and the newsletter component with the mock adapter.

**Phase 7: Hardening**
Write the Playwright tests (including the network-leak test), do the Lighthouse pass, fix accessibility issues and write a README section on how to edit questions, facts and types.

## 14. Open items for humans

These are not for Claude Code to decide. Leave clear TODOs.

- Fact numbers and sources for questions 1, 4, 7 and 8.
- Swedish translations, or a review of drafted ones.
- Final type descriptions in all languages.
- Soft-launch feedback on whether any tree felt like a punishment, especially the environment axis's tidy-garden end.
- Choosing one of the three visual style options on the lab page in Phase 4. Ideally a few people from the WhatsApp group vote, so the choice isn't one person's taste.
- Analytics provider (Plausible or Umami) and site id.
- Newsletter provider and the legal data controller for the privacy notice.
- Final route slugs for Swedish and English.
