# EVE Frontier Apps — Directory

A community-maintained directory of tools, dapps, and resources built for EVE Frontier. Deployed at `/directory`.

## Features

- **App grid** — searchable and filterable cards with OG metadata (title, description, thumbnail) fetched via [microlink.io](https://microlink.io)
- **Tag filters** — filter by tag (`dapp`, `tool`, etc.) or search by name, description, or domain
- **Wallet connect** — connect a Sui wallet via the EVE Frontier dApp kit
- **On-chain favourites** — star any app to save it to your wallet on the Stillness network; favourites sync across devices automatically
- **In-browser viewer** — open any app in a full-screen iframe without leaving the directory (`/directory/view?url=...`)

## On-chain Favourites

Favourites are stored as a Sui owned object (`Favorites`) per wallet using the `contracts/favorites` Move package. Each object holds a `vector<String>` of app URLs with deduplication and a 100-item cap enforced on-chain.

| | |
|---|---|
| **Network** | Sui testnet (Stillness) |
| **Package ID** | `0x6914bc01f9f668ff99c672d601d3fb5bff27251b451b2e948d24e9d809f01d66` |

The feature is gated behind `VITE_FAVORITES_PACKAGE_ID` — if the env var is unset, the favourite buttons are hidden and the app works as a read-only directory.

## Local Development

```bash
pnpm dev:directory
# → http://localhost:5176/directory/
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_FAVORITES_PACKAGE_ID` | For favourites | Sui package ID of the deployed `favorites` contract |

Add this to `apps/directory/.env` for local development, and to **Cloudflare Pages → Settings → Environment variables** for production.

## App Data

Apps are curated in a separate GitHub repo and fetched at runtime:

```
https://github.com/Econmartin/eve-frontier-apps (urls.json)
```

Format: `Array<{ url: string; tags: string[] }>`

To add or remove an app, open a PR against that repo. This keeps curation separate from the directory UI and prevents on-chain spam.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mysten/dapp-kit-react` + `@evefrontier/dapp-kit` for wallet
- `@mysten/sui` for Sui transactions and RPC queries
- `@tanstack/react-query` for data fetching and cache invalidation
- React Router with `basename: '/directory'`
