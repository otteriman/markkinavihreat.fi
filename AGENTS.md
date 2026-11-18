# AGENTS.md

## Mission

markkinavihreat.fi is the home base for Markkinavihreät (Market Greens), a market-liberal / social-liberal network within Finland's Green League. Built with Astro + Tailwind CSS v4 + content collections, static output only (no SSR), deployed to Cloudflare Workers as static assets. Content is authored in Finnish (fi, default/unprefixed), Swedish (sv), and English (en) — every content collection entry must exist in all three locales.

## Toolchain

| Intent                   | Command                                           |
| ------------------------ | ------------------------------------------------- |
| Dev server               | `npm run dev`                                     |
| Build                    | `npm run build`                                   |
| Preview build            | `npm run preview`                                 |
| Type check               | `npm run check`                                   |
| Lint                     | `npm run lint`                                    |
| Format                   | `npm run format`                                  |
| Unit tests               | `npm run test`                                    |
| E2E smoke tests          | `npm run test:e2e`                                |
| Translation parity check | `npm run validate:translations`                   |
| Deploy                   | `npm run deploy` (builds, then `wrangler deploy`) |

## Git workflow

1. **Feature branch** — all changes go on a feature branch cut from an up-to-date `main`. Never commit directly to `main`.
2. **Small commits** — each commit is one logical, reviewable change (e.g. "add team roster content", "add blog listing page"), not one giant commit per session. Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`.
3. **Push immediately** — push after every commit, not batched at the end.
4. **Co-authored-by trailer** — every AI-authored commit includes a `Co-authored-by:` trailer identifying the agent.
5. **PR for review** — open a PR once the branch is ready; don't merge to `main` without human review.

## Content map

- `src/content/team/<slug>.<locale>.md` — team roster, one file per person per locale.
- `src/content/programs/<slug>.<locale>.md` — programs/suggestions; each entry is a full program (not one entry per demand).
- `src/content/blog/<slug>.<locale>.md` — blog posts; `date` frontmatter field drives the `/blogi/<date>/<slug>/` URL.
- `src/content/manifesto/manifesto.<locale>.md` — the manifesto, one entry per locale.
- Schemas: `src/content.config.ts`. UI strings (nav/footer): `src/i18n/ui.ts`. Static page copy (hero text etc.): `src/i18n/pages.ts`.
- Layouts: `src/layouts/`. Shared components: `src/components/`. Page markup/logic lives in `src/components/pages/*Body.astro` (one per route, takes a `locale` prop). Routes: `src/pages/**` (fi, unprefixed) mirrored under `src/pages/sv/**` and `src/pages/en/**` — each route file is a thin wrapper that renders the matching `*Body.astro` with a hardcoded locale (dynamic routes also filter their own `getStaticPaths` to that locale). Don't reintroduce a single `[[...locale]]` catch-all directory for this — Astro 7.1.4's static build mis-resolves that pattern's output paths (confirmed by building it: routes landed in literal `[]`/`[en]`/`[sv]` directories instead of `/`, `/en/`, `/sv/`).

## Judgment boundaries

- Never commit secrets, tokens, or `.env` files.
- Ask before adding external dependencies.
- Static output only — never introduce SSR without discussion.
- Don't guess on ambiguous copy or translations — ask, or leave a clearly marked TODO rather than inventing facts (this is a real political site).
- Everything Markkinavihreät publishes (site, social posts, videos) is non-commercial political communication by politicians, not marketing or commercial activity — judge material, quotes and clips by that, not by advertising rules, and weigh them against the European Court of Human Rights (ECtHR) case law on freedom of expression.
- Every content collection entry needs fi + sv + en; run `npm run validate:translations` before committing content changes.
