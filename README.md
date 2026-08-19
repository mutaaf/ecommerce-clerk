# Clerk

[![CI](https://github.com/mutaaf/ecommerce-clerk/actions/workflows/deploy.yml/badge.svg)](https://github.com/mutaaf/ecommerce-clerk/actions/workflows/deploy.yml)

Live at **https://ecommerce-clerk.vercel.app**

Two things live here and they share nothing but `CLAUDE.md`.

```
index.html      the merchant page
platform.html   the platform and architecture page
content/        SITE: every word, number and category on both pages
src/            renderers. Nothing here is content specific
styles/         tokens.css, base.css, components.css
api/            the serverless function behind the hero input
platform/       the commerce layer: adapter contract, WooCommerce, attribution
tools/          screenshots, axe, Lighthouse, focus and intent checks
```

No build step and no framework. The pages are ES modules served as files,
`platform/` is TypeScript run directly by Node's type stripping.

## Running it

```
npm install
npm run dev          # http://localhost:8123, static pages plus /api
npm test             # the platform test suite
```

The hero input reads what a visitor types through `api/parse-intent.js`,
which calls a model with a key from the environment. Copy `.env.example`
and set `ANTHROPIC_API_KEY` to turn it on. Without a key the endpoint
answers `200 {"signals": []}` rather than an error, so the browser falls
back quietly; the same happens if the call fails or takes longer than two
seconds. The visitor never sees a difference, which is the point.

`tools/dev-server.mjs` reads the response headers out of `vercel.json` and
applies them, so the content security policy and the cache rules are the
same locally as in production and every check below runs against them.

## Checks

```
npm run rules        # the checkable rules from CLAUDE.md
npm test             # the platform test suite
npm run check        # both of the above

npm run shots        # screenshots at 1440, 900 and 390 into shots/
npm run axe          # axe-core, both pages, both widths
npm run lighthouse   # mobile preset; `npm run lighthouse -- desktop` for desktop
npm run focus        # tab through every interactive element
npm run intent       # the four paths the hero input can take
```

The first three run anywhere. The rest need `npm run dev` in another
terminal. Every one of them exits non-zero on failure, which is what lets
CI use them unchanged.

## Rules that are not negotiable

They are in `CLAUDE.md`, and the ones a tool can check are checked:
no colour, font or shadow outside `styles/tokens.css`; content lives in
`content/`, never inline in markup; claims are set in the display face and
anything the system can prove is set in mono.

## Deploying

Vercel serves the repo root as static files and `api/` as functions. There
is no build step, so there is nothing to configure beyond two files:

- `.vercelignore` decides what ships. It is not derived from `.gitignore`,
  so everything that is not the site is named there explicitly. In
  particular `platform/` is excluded: it is unbuilt TypeScript, and
  deploying it would publish the attribution and invoice implementation as
  readable source at a public URL.
- `vercel.json` holds the response headers and switches Vercel's own git
  deployments off, because CI owns the deploy instead.

### How a change reaches production

```
push to main  ->  .github/workflows/deploy.yml
                    job ci      calls ci.yml
                                  checks:  house rules, platform tests
                                  audit:   axe, focus, intent, shots, Lighthouse
                    job deploy  only if ci passed
                                  vercel pull / build / deploy --prod
```

A pull request runs the same checks and deploys a preview instead. Nothing
reaches Vercel without passing first, because `git.deploymentEnabled` is
`false` in `vercel.json` and the CLI is the only thing that deploys.

Lighthouse holds accessibility, best practices and SEO at 100 and gives
performance a floor rather than a target, because a shared CI runner is a
noisier machine than a laptop.

### Secrets

| Where | Name | What for |
|---|---|---|
| GitHub repo secrets | `VERCEL_TOKEN` | lets the CLI deploy |
| GitHub repo secrets | `VERCEL_ORG_ID` | from `.vercel/project.json` after `vercel link` |
| GitHub repo secrets | `VERCEL_PROJECT_ID` | same file |
| Vercel project env | `ANTHROPIC_API_KEY` | the hero input. **Not set yet**: the deployed site runs on the scripted fallback, which is a supported state, not a fault |

```
vercel link                                    # writes .vercel/project.json
vercel env add ANTHROPIC_API_KEY production
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID     < <(node -p "require('./.vercel/project.json').orgId")
gh secret set VERCEL_PROJECT_ID < <(node -p "require('./.vercel/project.json').projectId")
```

### Caching

Assets are not content hashed, because there is no build step to hash
them. So HTML revalidates every time and `styles/`, `src/` and `content/`
get ten minutes. That trades a Lighthouse cache point for never serving a
visitor new markup against old CSS, which is the right way round.
