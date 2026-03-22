# EVE Frontier IGB Bridge Research

Notes on the undocumented JavaScript bridge functions injected by the game client into the in-game browser (IGB).

---

## Known Globals on `window`

| Name | Type | Notes |
|------|------|-------|
| `eveFrontierRpcRequest` | function | JSON-RPC 2.0 endpoint — main one to use |
| `_eveFrontierRpcRequest` | function | Raw/internal version — all calls timeout |
| `callWallet` | function | Wallet bridge — errors without args |
| `ccpPython` | object | Has `pythonCall` and `pythonReply` methods |
| `__pythonCall` | function | Low-level Python bridge |
| `captureEvents` | function | Browser event bridge |
| `releaseEvents` | function | Browser event bridge |
| `WALLET_API_CHAIN` | string | `"sui:testnet"` |
| `ongotpointercapture` | object | Pointer capture event |
| `onlostpointercapture` | object | Pointer capture event |

---

## `eveFrontierRpcRequest`

- Speaks **JSON-RPC 2.0** — requires `{ jsonrpc: "2.0", id, method, params }`
- Calling with `{}` returns a response (id 4, error -32603, message `"method"`) — server is alive
- Tried method names: `getContext`, `getCharacter`, `getAssembly`, `getSmartObject`, `getObjectId`, `getPlayer`, `getSolarSystem`, `getLocation`, `getItemId`, `getAssemblyId` — all return **method not found**
- Correct method names unknown — need to find the right ones

## `ccpPython`

- Is an **object** (not a function)
- Has two methods: `pythonCall` (function), `pythonReply` (function)
- Likely a bridge into the game client's Python runtime (CCP uses Python extensively)
- Calling convention unknown — investigating

## `WALLET_API_CHAIN`

- Value: `"sui:testnet"`
- Confirms the game is running on Sui testnet

---

## Open Questions

- What are the valid JSON-RPC method names for `eveFrontierRpcRequest`?
- What does `ccpPython.pythonCall` accept as arguments?
- What does `callWallet` do / what args does it need?
- Are assembly/character IDs accessible via any of these?
