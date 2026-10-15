# markkinavihreat.fi

Markkinavihreiden kotisivut. Astro + Tailwind CSS v4, static output, fi/sv/en, deployed to Cloudflare Workers.

```
npm install
npm run dev
```

See [AGENTS.md](./AGENTS.md) for the full toolchain, content map, and conventions.

Production deploys automatically from `main` (Cloudflare Workers Builds). If the live site lags behind `main`, check the build history for the `markkinavihreat` worker.

## Quiz (in development)

The "Oletko markkinavihreä?" quiz is being built in phases; see [docs/quiz-implementation-plan.md](./docs/quiz-implementation-plan.md). Its pages are `noindex` until launch.
