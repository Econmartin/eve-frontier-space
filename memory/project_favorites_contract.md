---
name: Favorites contract deployment
description: On-chain favourites contract deployed to Sui testnet for the directory app
type: project
---

`contracts/favorites` deployed to **Sui testnet** on 2026-03-29.

**Package ID:** `0x6914bc01f9f668ff99c672d601d3fb5bff27251b451b2e948d24e9d809f01d66`
**UpgradeCap ID:** `0x213ddc84a62566de45c81c3a01e844e5fc03dbbdb3a94c2ccd8c839c23ff379d`
**Transaction Digest:** `7WNVscNY5D8WqHrQNNGQWZDGb48L5tD8TLpQLS8cc7cj`
**Deployer address:** `0xe2eded98fa755561a171d4405c71b2cf28a7ee9c85b123a07134a6457965b94f`
**Cost:** ~9.4M MIST (~0.0094 SUI)

Set in `apps/directory/.env` as `VITE_FAVORITES_PACKAGE_ID`.

**Why:** Hackathon bonus (10%) for deploying to Stillness network. Contract stores cross-device favourites as an owned `Favorites` object per wallet — `vector<String>` of app URLs. Functions: `create`, `add`, `remove`.

**How to apply:** If the contract ever needs redeployment or upgrade, the UpgradeCap is held by the deployer address above. Update `apps/directory/.env` with the new package ID.
