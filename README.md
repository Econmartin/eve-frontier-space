# EVE Frontier Space — Monorepo

Community tools and educational resources for EVE Frontier on Sui.

## Structure

```
apps/
  home/      # Community landing page and app directory        (served at /)
  move/      # Interactive Move on Sui course (two courses,    (served at /move)
             #   real WASM compiler, on-chain completion)
  finance/   # DeFi dashboard for the eve-bank contract        (served at /finance)

contracts/
  eve-bank/  # Generic Move smart contract (bank · loans · lottery)

packages/
  assets/    # Shared fonts and images used across all apps
```

## Development

```bash
# Install dependencies (from root)
npm install

# Run all apps in parallel
npm run dev

# Run a single app
npm run dev:home     # http://localhost:5173
npm run dev:move     # http://localhost:5174
npm run dev:finance  # http://localhost:5175
```

## Build

```bash
npm run build
```

Builds all three apps and merges their output into `dist/` via `scripts/combine-dist.mjs`:

```
dist/           ← home app    (serves /)
dist/move/      ← move app    (serves /move/*)
dist/finance/   ← finance app (serves /finance/*)
```

## Deployment

Deployed to **Cloudflare Pages** with a Workers script for SPA routing.

```bash
# Deploy (Cloudflare Wrangler)
npx wrangler pages deploy dist/
```

`worker.js` handles SPA fallback routing: unknown paths under `/move/*` and `/finance/*` are served their respective `index.html`.

## Smart Contract

The `eve-bank` Move contract lives in `contracts/eve-bank/`. See [`contracts/eve-bank/README.md`](contracts/eve-bank/README.md) for deployment addresses and setup instructions.

```bash
# Run contract tests
cd contracts/eve-bank
sui move test
```
